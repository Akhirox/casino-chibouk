// Progression : rangs VIP + rakeback, roue du bonus quotidien avec série, quêtes du jour
import { CONFIG } from './config.js';
import { parisDate } from './wallet.js';
import { randInt } from './games/slots-math.js';

/* ------------------------------ VIP ------------------------------ */
// Rang selon le total misé depuis toujours.
// rb = rakeback : part de chaque mise aux jeux de casino versée dans une cagnotte, récupérable quand on veut
// mult = multiplicateur des gains gratuits (roue du jour, quêtes, quiz, mot du jour, casse-briques…) ; up = Brundles offerts en atteignant le rang
export const VIP = [
  { id: 'ouistiti', name: 'Ouistiti', min: 0, rb: 0, mult: 1, up: 0, color: '#9aa79f' },
  { id: 'tamarin', name: 'Tamarin', min: 10000, rb: 0.001, mult: 1.2, up: 500, color: '#d9a066' },
  { id: 'macaque', name: 'Macaque', min: 50000, rb: 0.002, mult: 1.5, up: 2000, color: '#cd7f32' },
  { id: 'capucin', name: 'Capucin', min: 250000, rb: 0.003, mult: 2, up: 7500, color: '#e6b88a' },
  { id: 'babouin', name: 'Babouin', min: 1000000, rb: 0.004, mult: 2.5, up: 25000, color: '#c0c9d0' },
  { id: 'chimpanze', name: 'Chimpanzé', min: 5000000, rb: 0.005, mult: 3, up: 100000, color: '#f5c542' },
  { id: 'mandrill', name: 'Mandrill', min: 25000000, rb: 0.006, mult: 4, up: 400000, color: '#2fb1ff' },
  // V18.2 : rangs élevés plus durs et bonus de passage plus petits. À ces volumes le hasard s'efface et le RTP réel colle au
  // RTP théorique : rakeback + bonus de passage doivent rester sous l'avantage du casino (1 % sur les jeux à 99 %).
  // Pendant chaque tranche à partir d'Orang-outan, le joueur récupère au plus ~0,73 % de ses mises, et 0,70 % au rang max :
  // un jeu à 99 % reste entre 99,5 et 99,9 % de retour effectif (voir tools/vip-rtp.mjs).
  { id: 'orang', name: 'Orang-outan', min: 250000000, rb: 0.0062, mult: 5, up: 300000, color: '#ff8a3d' },
  { id: 'gorille', name: 'Gorille', min: 2500000000, rb: 0.0064, mult: 6, up: 2500000, color: '#3ddc84' },
  { id: 'argente', name: 'Gorille argenté', min: 25000000000, rb: 0.0066, mult: 8, up: 15000000, color: '#e8eef2' },
  { id: 'roi', name: 'Roi Singe', min: 250000000000, rb: 0.007, mult: 10, up: 100000000, color: '#c77dff' },
];
export const vipIndex = (id) => VIP.findIndex((v) => v.id === id);
export function vipOf(totalWagered = 0) {
  let i = 0;
  while (i + 1 < VIP.length && totalWagered >= VIP[i + 1].min) i++;
  return { ...VIP[i], index: i, next: VIP[i + 1] || null };
}
// Avancement vers le rang suivant (0 à 100)
export function vipProgress(totalWagered = 0) {
  const v = vipOf(totalWagered);
  return v.next ? Math.max(0, Math.min(100, ((totalWagered - v.min) / (v.next.min - v.min)) * 100)) : 100;
}
export const vipBadge = (p) => { const v = vipOf((p.stats && p.stats.totalWagered) || 0); return `<span class="vip-badge vip-${v.id}" style="--vc:${v.color}" title="Rang VIP : ${v.name} (clique pour voir tous les rangs)" data-vip>${v.name}</span>`; };
export const xMult = (m) => '×' + String(m).replace('.', ',');
export const freeMult = (wallet) => vipOf(wallet.stats.totalWagered).mult;
export const pctFmt = (x) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';

// Cagnotte de rakeback (alimentée à chaque mise, récupérable à tout moment)
export const rakePot = (wallet) => (wallet.p.rake && wallet.p.rake.pot) || 0;
export function claimRake(wallet) {
  const amount = Math.floor(rakePot(wallet));
  if (amount < 1) return 0;
  wallet.p.rake = { ...(wallet.p.rake || {}), pot: rakePot(wallet) - amount, total: ((wallet.p.rake && wallet.p.rake.total) || 0) + amount };
  wallet.credit('rakeback', amount);
  wallet.flush();
  return amount;
}

// Rakeback proportionnel à l'avantage du casino de chaque jeu (référence : 1 %, les jeux à 99 %) :
// blackjack bien joué ~0,5 % → ×0,4 ; tickets 2 % → ×2,3 ; roulette 2,7 % → ×3,7. Ainsi, aux rangs élevés,
// chaque jeu reste entre 99,5 et 99,9 % de retour effectif. La slot (RTP ≥ 100 % avec le jackpot) garde ×1 pour l'instant.
export const RAKE_WEIGHT = { blackjack: 0.4, scratch: 2.3, roulette: 3.7 };

// Suivi des rangs : rakeback sur chaque mise de casino + bonus de passage de rang (une seule fois par rang)
export function initVip(wallet, onUp) {
  wallet.freeMult = () => freeMult(wallet);
  const pay = () => {
    const v = vipOf(wallet.stats.totalWagered);
    const done = Number.isInteger(wallet.p.vipLevel) ? wallet.p.vipLevel : 0;
    if (v.index <= done) return;
    let bonus = 0;
    for (let i = done + 1; i <= v.index; i++) bonus += VIP[i].up;
    wallet.p.vipLevel = v.index;
    if (bonus > 0) wallet.credit('vipup', bonus, { rank: v.name, index: v.index });
    onUp && onUp(v, bonus);
  };
  const off = wallet.on((e) => {
    if (!e || e.type !== 'bet' || !wallet.stats.games[e.game]) return;
    const rate = vipOf(wallet.stats.totalWagered).rb * (RAKE_WEIGHT[e.game] ?? 1);
    if (rate > 0) wallet.p.rake = { ...(wallet.p.rake || { total: 0 }), pot: rakePot(wallet) + e.amount * rate };
    pay();
  });
  // rattrapage : rangs déjà atteints avant leur création (bonus versés une fois)
  setTimeout(pay, 1500);
  return { destroy: () => { off(); wallet.freeMult = null; } };
}

/* ------------------------------ Roue du jour ------------------------------ */
export const streakMult = (n) => Math.min(CONFIG.STREAK_MAX, 1 + CONFIG.STREAK_STEP * Math.max(0, n - 1));
export function spinDaily(wallet) {
  const seg = randInt(CONFIG.DAILY_WHEEL.length);
  const n = wallet.nextStreak();
  const mult = streakMult(n);
  const vip = vipOf(wallet.stats.totalWagered);
  return { seg, base: CONFIG.DAILY_WHEEL[seg], streak: n, mult, vip: vip.mult, vipName: vip.name, amount: Math.round(CONFIG.DAILY_WHEEL[seg] * mult * vip.mult) };
}

/* ------------------------------ Quêtes du jour ------------------------------ */
const CASINO = { slots: 'à la Chibouk Slot', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue', limbo: 'au Limbo', scratch: 'aux jeux à gratter' };
const ROUNDS = { slots: 40, blackjack: 12, roulette: 15, plinko: 40, crash: 15, tower: 10, mines: 10, dice: 40, hilo: 10, keno: 20, wheel: 30, limbo: 30, scratch: 15 };
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
  { id: 'queens1', tier: 0, n: 1, text: () => 'Résous une grille de Queens', ev: (e) => (e.type === 'free' && e.game === 'queens' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'pinpoint1', tier: 0, n: 1, text: () => 'Trouve une catégorie à Pinpoint', ev: (e) => (e.type === 'free' && e.game === 'pinpoint' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'snake10', tier: 0, n: 1, text: () => 'Mange 10 bananes en une partie de Snake', ev: (e) => (e.type === 'free' && e.game === 'snake' && e.extra && e.extra.Bananas >= 10 ? 1 : 0) },
  { id: 'tango2', tier: 1, n: 2, text: (n) => `Résous ${n} grilles de Tango`, ev: (e) => (e.type === 'free' && e.game === 'tango' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'sudoku1', tier: 1, n: 1, text: () => 'Résous un sudoku', ev: (e) => (e.type === 'free' && e.game === 'sudoku' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'mines1', tier: 1, n: 1, text: () => 'Gagne une partie de démineur', ev: (e) => (e.type === 'free' && e.game === 'demineur' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'sudokuMed', tier: 2, n: 1, text: () => 'Résous un sudoku moyen ou difficile', ev: (e) => (e.type === 'free' && e.game === 'sudoku' && e.extra && (e.extra.Won1 || e.extra.Won2) ? 1 : 0) },
  { id: 'queens9', tier: 2, n: 1, text: () => 'Résous une grille de Queens en 9 × 9', ev: (e) => (e.type === 'free' && e.game === 'queens' && e.extra && e.extra.Won9 ? 1 : 0) },
  { id: 'msMid', tier: 2, n: 1, text: () => 'Gagne au démineur en moyen ou difficile', ev: (e) => (e.type === 'free' && e.game === 'demineur' && e.extra && (e.extra.Won1 || e.extra.Won2) ? 1 : 0) },
  { id: 'farmBuild', tier: 0, n: 2, text: (n) => `Lance ${n} chantiers à ta ferme à bananes`, ev: (e) => (e.type === 'farm' && (e.act === 'build' || e.act === 'upgrade') ? 1 : 0) },
  { id: 'farmSell', tier: 1, n: 300, text: (n) => `Vends ${n} bananes au marché de ta ferme`, ev: (e) => (e.type === 'farm' && e.act === 'sell' ? e.bananas || 0 : 0) },
  { id: 'memory1', tier: 0, n: 1, text: () => 'Gagne une partie de Memory', ev: (e) => (e.type === 'free' && e.game === 'memory' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'cw1', tier: 1, n: 1, text: () => 'Termine une grille de mots croisés', ev: (e) => (e.type === 'free' && e.game === 'crossword' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'cwClean', tier: 2, n: 1, text: () => 'Termine une grille de mots croisés moyenne ou difficile sans révéler de lettre', ev: (e) => (e.type === 'free' && e.game === 'crossword' && e.extra && e.extra.Clean && (e.extra.Won1 || e.extra.Won2) ? 1 : 0) },
  { id: 'free3', tier: 0, n: 3, text: (n) => `Termine ${n} parties de jeux gratuits (quiz, Sudoku, Snake…)`, ev: (e) => (e.type === 'free' ? 1 : 0) },
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
        setTimeout(() => { wallet.p.stats.questsDone = (wallet.p.stats.questsDone || 0) + 1; wallet.credit('quest', Math.round(q.r * freeMult(wallet)), { quest: q.id }); onDone && onDone(q, false); }, 0);
      }
    }
    if (changed && !day.bonus && day.quests.every((q) => q.done)) {
      day.bonus = true;
      setTimeout(() => { wallet.credit('quest', Math.round(CONFIG.QUEST_BONUS * freeMult(wallet)), { bonus: true }); onDone && onDone(null, true); }, 50);
    }
  });
  return { destroy: off };
}
