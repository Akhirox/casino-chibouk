// Caisses (lootboxes façon « case opening ») : contenu, tirage, application des gains, boosts temporaires et permanents.
// Tout est tiré et appliqué dans le navigateur (comme les jeux), au moment du clic ; l'animation ne fait que le montrer.
import { randInt } from './games/slots-math.js';
import * as F from './farm-core.js';
import { LOOT_ITEMS } from './shop.js';
import { cosBonus } from './bonus.js';

const COS_CAT = { frame: 'Cadre', title: 'Titre', cardback: 'Dos de cartes', theme: 'Thème de slot', effect: 'Effet de victoire' };

// Raretés et probabilités (mêmes proportions que les caisses de CS)
export const RARITIES = {
  blue: { name: 'Commun', color: '#4b69ff', w: 79920 },
  purple: { name: 'Rare', color: '#8847ff', w: 15980 },
  pink: { name: 'Épique', color: '#d32ce6', w: 3200 },
  red: { name: 'Légendaire', color: '#eb4b4b', w: 640 },
  gold: { name: 'Mythique', color: '#e4ae39', w: 260 },
};
const R_TOTAL = Object.values(RARITIES).reduce((a, r) => a + r.w, 0); // 100 000
export const R_ORDER = ['blue', 'purple', 'pink', 'red', 'gold'];

// Mini-jeux qui peuvent recevoir un boost (clé = jeu, icône du menu)
export const BOOST_GAMES = {
  sudoku: ['Sudoku', 'sudoku'], queens: ['Queens', 'queens'], tango: ['Tango', 'tango'], pinpoint: ['Pinpoint', 'pinpoint'],
  demineur: ['Démineur', 'demineur'], snake: ['Snake', 'snake'], memory: ['Memory', 'memory'], crossword: ['Mots croisés', 'crossword'],
  quiz: ['Calcul mental', 'quiz'], capitals: ['Quiz capitales', 'globe'], flags: ['Quiz drapeaux', 'flag'], movies: ['Quiz ciné', 'film'],
  higher: ['Plus ou moins', 'higher'], breaker: ['Casse-briques', 'breaker'], motus: ['Mot du jour', 'motus'],
};
export const PERM_MAX = Infinity; // bonus permanent sans plafond (V25)
export const TICKETS = { banane: ['Banane Express', 10], singe: ['Singe d\'Or', 100], tresor: ['Trésor de la Jungle', 1000] };

// Caisses. theme : std (classiques), cos (cosmétiques), risk (va-tout), farm (fermier)
// k = multiplicateur des gains en Brundles ; perm = bonus permanent du lot mythique (classiques) ;
// tk = tickets à gratter des lots communs et rares (caisses pas chères) : [ticket, nombre commun, nombre rare]
export const CASES = [
  { id: 'coco', theme: 'std', name: 'Caisse Noix de coco', price: 1000, k: 0.92, perm: 0.005, tk: ['singe', 5, 15], hue: '#b07a4a', desc: 'La moins chère : Brundles et tickets à gratter.' },
  { id: 'banane', theme: 'std', name: 'Caisse Banane', price: 5000, k: 0.97, perm: 0.01, tk: ['tresor', 3, 9], hue: '#f5c542', desc: 'Brundles, tickets Trésor et boosts.' },
  { id: 'jungle', theme: 'std', name: 'Caisse Jungle', price: 50000, k: 1.06, perm: 0.02, tk: ['tresor', 30, 90], hue: '#3ddc84', desc: 'Plus de Brundles, de gros paquets de tickets.' },
  { id: 'singe', theme: 'std', name: 'Caisse Singe d\'Or', price: 500000, k: 1.1, perm: 0.03, hue: '#ff8a3d', desc: 'Pour les gros joueurs.' },
  { id: 'roi', theme: 'std', name: 'Caisse du Roi', price: 5000000, k: 1.15, perm: 0.05, hue: '#c77dff', desc: 'La plus généreuse : +5 % permanent en mythique.' },
  { id: 'cosmo', theme: 'cos', name: 'Caisse Cosmétique', price: 50000, k: 1, hue: '#ff6fb5', desc: 'Que des cosmétiques exclusifs (avec leurs bonus). Doublons remboursés.' },
  { id: 'vatout', theme: 'risk', name: 'Caisse Va-tout', price: 250000, k: 0.85, hue: '#ff4d5e', desc: 'Souvent presque rien… mais jusqu\'à ×127 le prix.' },
  { id: 'fermier', theme: 'farm', name: 'Caisse du Fermier', price: 100000, k: 1, hue: '#9bd34a', desc: 'Graines d\'or, vitesse de construction, boosts de récolte.' },
];
export const caseById = (id) => CASES.find((c) => c.id === id);
export const CASE_GROUPS = [['std', 'Caisses classiques'], ['theme', 'Caisses à thème']];

// Contenu de chaque caisse. kind : br (Brundles, x × prix × k), scratch (tickets à gratter), boost (tous les mini-jeux ×m),
// farm (production ×m pendant h heures), seed (graines d'or), speed (vitesse de construction permanente), rush (chantiers finis),
// perm (bonus permanent des gains gratuits), cos (cosmétique exclusif de la rareté)
export function poolOf(c) {
  if (c.theme === 'cos') return [
    { r: 'blue', w: 3, kind: 'cos' }, { r: 'blue', w: 1, kind: 'br', x: 0.25 }, { r: 'blue', w: 1, kind: 'br', x: 0.45 },
    { r: 'purple', w: 1, kind: 'cos' }, { r: 'pink', w: 1, kind: 'cos' }, { r: 'red', w: 1, kind: 'cos' }, { r: 'gold', w: 1, kind: 'cos' },
  ];
  if (c.theme === 'risk') return [
    { r: 'blue', w: 3, kind: 'br', x: 0.05 }, { r: 'blue', w: 3, kind: 'br', x: 0.15 }, { r: 'blue', w: 2, kind: 'br', x: 0.3 },
    { r: 'purple', w: 2, kind: 'br', x: 1 }, { r: 'purple', w: 1, kind: 'br', x: 2 },
    { r: 'pink', w: 2, kind: 'br', x: 6 }, { r: 'pink', w: 1, kind: 'br', x: 10 },
    { r: 'red', w: 1, kind: 'br', x: 25 },
    { r: 'gold', w: 1, kind: 'br', x: 150 },
  ];
  if (c.theme === 'farm') return [
    { r: 'blue', w: 2, kind: 'br', x: 0.4 }, { r: 'blue', w: 2, kind: 'farm', m: 1.5, h: 6 }, { r: 'blue', w: 1, kind: 'speed', s: 0.01 },
    { r: 'purple', w: 2, kind: 'farm', m: 2, h: 8 }, { r: 'purple', w: 1, kind: 'speed', s: 0.02 }, { r: 'purple', w: 1, kind: 'br', x: 1.5 },
    { r: 'pink', w: 1, kind: 'farm', m: 2, h: 24 }, { r: 'pink', w: 1, kind: 'rush' }, { r: 'pink', w: 1, kind: 'speed', s: 0.05 },
    { r: 'red', w: 2, kind: 'seed', n: 1 }, { r: 'red', w: 1, kind: 'farm', m: 3, h: 24 },
    { r: 'gold', w: 1, kind: 'seed', n: 3 }, { r: 'gold', w: 1, kind: 'speed', s: 0.15 },
  ];
  // classiques
  const tk = c.tk;
  return [
    { r: 'blue', w: 3, kind: 'br', x: 0.3 }, { r: 'blue', w: 3, kind: 'br', x: 0.5 }, { r: 'blue', w: 2, kind: 'br', x: 0.7 },
    tk ? { r: 'blue', w: 2, kind: 'scratch', t: tk[0], n: tk[1] } : { r: 'blue', w: 2, kind: 'br', x: 0.6 },
    { r: 'purple', w: 3, kind: 'br', x: 1.2 }, { r: 'purple', w: 2, kind: 'br', x: 1.8 }, { r: 'purple', w: 1, kind: 'farm', m: 2, h: 4 },
    tk ? { r: 'purple', w: 2, kind: 'scratch', t: tk[0], n: tk[2] } : { r: 'purple', w: 2, kind: 'br', x: 1.5 },
    { r: 'pink', w: 2, kind: 'br', x: 4 }, { r: 'pink', w: 1, kind: 'br', x: 6 }, { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 2, h: 6 }, { r: 'pink', w: 1, kind: 'farm', m: 2, h: 24 },
    { r: 'red', w: 2, kind: 'br', x: 15 }, { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: 24 },
    { r: 'gold', w: 1, kind: 'br', x: 60 }, { r: 'gold', w: 1, kind: 'perm' },
  ];
}
const DUP_X = { blue: 0.5, purple: 1.5, pink: 5, red: 15, gold: 60 }; // cosmétique déjà possédé → Brundles
const COS_TIER = { common: 'blue', rare: 'purple', epic: 'pink', legend: 'red', mythic: 'gold' };
export const brAmount = (c, x) => Math.round(c.price * c.k * x);
const tierItems = (c, r) => poolOf(c).filter((it) => it.r === r);
const wsum = (list) => list.reduce((a, it) => a + it.w, 0);
// Probabilité d'un lot du contenu
export const chanceOf = (c, it) => (RARITIES[it.r].w / R_TOTAL) * (it.w / wsum(tierItems(c, it.r)));
// Valeur moyenne en Brundles (tickets à gratter comptés à leur valeur de jeu, 98 %), hors boosts, cosmétiques, graines…
export const valueOf = (c) => poolOf(c).reduce((a, it) => a + chanceOf(c, it) * (it.kind === 'br' ? brAmount(c, it.x) : it.kind === 'scratch' ? TICKETS[it.t][1] * it.n * 0.98 : 0), 0);

function pickWeighted(list, rnd = randInt) {
  let n = rnd(wsum(list));
  for (const it of list) { if (n < it.w) return it; n -= it.w; }
  return list[list.length - 1];
}
function rollRarity(rnd = randInt) {
  let n = rnd(R_TOTAL);
  for (const r of R_ORDER) { if (n < RARITIES[r].w) return r; n -= RARITIES[r].w; }
  return 'blue';
}

// Tirage d'un lot concret. p = profil (pour les doublons de cosmétiques et le plafond du bonus permanent) ;
// sans p (remplissage de la bande animée), on tire simplement un lot plausible.
export function draw(c, p = null, rnd = randInt) {
  const r = rollRarity(rnd);
  return concrete(c, pickWeighted(tierItems(c, r), rnd), p, rnd);
}
// Lot d'une rareté donnée (décor de la bande animée)
export const drawTier = (c, r, rnd = randInt) => concrete(c, pickWeighted(tierItems(c, r), rnd), null, rnd);
function concrete(c, it, p, rnd = randInt) {
  const d = { r: it.r, kind: it.kind };
  if (it.kind === 'br') d.amount = brAmount(c, it.x);
  else if (it.kind === 'scratch') { d.t = it.t; d.n = it.n; }
  else if (it.kind === 'boost') { d.game = it.game; d.m = it.m; d.h = it.h; }
  else if (it.kind === 'farm') { d.m = it.m; d.h = it.h; }
  else if (it.kind === 'seed') d.n = it.n || 1;
  else if (it.kind === 'speed') {
    d.s = it.s;
    const cur = (p && p.farm && p.farm.spd) || 0;
    if (p && cur >= F.SPEED_MAX - 1e-9) { d.kind = 'br'; d.amount = brAmount(c, { blue: 0.5, purple: 1.5, pink: 5, gold: 60 }[it.r] || 1); d.capped = 'speed'; }
  } else if (it.kind === 'perm') d.perm = c.perm;
  else if (it.kind === 'cos') {
    const list = LOOT_ITEMS.filter((x) => COS_TIER[x.loot] === it.r);
    const pick = list[rnd(list.length)];
    d.cos = pick.id; d.name = pick.name; d.cat = pick.cat;
    if (p && p.shop && p.shop.owned && p.shop.owned[pick.id]) { d.dup = true; d.amount = brAmount(c, DUP_X[it.r]); }
  }
  return d;
}

// Texte d'un lot : { title, sub, icon }
export function labelOf(d) {
  const fx = (m) => '×' + String(m).replace('.', ',');
  const pc = (x) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  switch (d.kind) {
    case 'br': return { title: Math.round(d.amount).toLocaleString('fr-FR'), sub: d.capped === 'speed' ? 'Brundles (vitesse de construction au maximum)' : 'Brundles', icon: 'coin' };
    case 'scratch': return { title: `${d.n} ticket${d.n > 1 ? 's' : ''} à gratter`, sub: `${TICKETS[d.t][0]} (${TICKETS[d.t][1].toLocaleString('fr-FR')} ${d.n > 1 ? 'chacun' : ''})`, icon: 'scratch' };
    case 'boost': return d.game === 'all'
      ? { title: `${fx(d.m)} mini-jeux`, sub: `tous les mini-jeux · ${d.h} h`, icon: 'gift' }
      : { title: `${fx(d.m)} ${BOOST_GAMES[d.game] ? BOOST_GAMES[d.game][0] : d.game}`, sub: `gains du jeu · ${d.h} h`, icon: BOOST_GAMES[d.game] ? BOOST_GAMES[d.game][1] : 'gift' };
    case 'farm': return { title: `Ferme ${fx(d.m)}`, sub: `production · ${d.h} h`, icon: 'banana' };
    case 'seed': return { title: d.n > 1 ? `${d.n} graines d'or` : 'Graine d\'or', sub: `+${5 * d.n} % de bananes, pour toujours`, icon: 'seed' };
    case 'speed': return { title: `Chantiers −${pc(d.s)}`, sub: 'temps de construction, pour toujours', icon: 'hourglass' };
    case 'rush': return { title: 'Chantiers terminés', sub: 'tous tes chantiers en cours, tout de suite', icon: 'bolt' };
    case 'perm': return { title: `+${pc(d.perm)} permanent`, sub: 'sur tous les gains gratuits', icon: 'star' };
    case 'cos': return { title: d.name, sub: d.dup ? `déjà possédé · +${Math.round(d.amount).toLocaleString('fr-FR')} Brundles` : `${COS_CAT[d.cat] || 'Cosmétique'} exclusif`, icon: { frame: 'user', title: 'medal', cardback: 'blackjack', theme: 'slots', effect: 'bolt' }[d.cat] || 'gift' };
  }
  return { title: '?', sub: '', icon: 'gift' };
}
// Texte générique d'une ligne du contenu
export function poolLabel(c, it) {
  if (it.kind === 'cos') {
    const list = LOOT_ITEMS.filter((x) => COS_TIER[x.loot] === it.r);
    return { title: 'Cosmétique exclusif', sub: list.map((x) => `${x.name} (${(COS_CAT[x.cat] || '').toLowerCase()})`).join(', '), icon: 'medal' };
  }
  return labelOf(concrete(c, it, null));
}

/* ---------- application ---------- */
const lootOf = (p) => (p.loot = p.loot && typeof p.loot === 'object' ? p.loot : { boosts: [], perm: 0 });
export function activeBoosts(p, now = Date.now()) {
  const l = p.loot;
  return l && Array.isArray(l.boosts) ? l.boosts.filter((b) => b.u > now) : [];
}
// Multiplicateur actif pour un mini-jeu : meilleur boost du jeu × meilleur boost « tous les mini-jeux »
export function boostMult(p, game, now = Date.now()) {
  const list = activeBoosts(p, now);
  const g = Math.max(1, ...list.filter((b) => b.g === game).map((b) => b.m));
  const all = Math.max(1, ...list.filter((b) => b.g === 'all').map((b) => b.m));
  return g * all;
}

// Applique un lot au profil (à appeler dans wallet.deferEvents pour ne révéler qu'après l'animation)
export function applyDrop(wallet, c, d) {
  const p = wallet.p, l = lootOf(p), now = Date.now();
  l.opened = (l.opened || 0) + 1;
  if (R_ORDER.indexOf(d.r) > R_ORDER.indexOf(l.best || 'blue')) l.best = d.r;
  if (d.kind === 'br' || d.dup) wallet.credit('loot', d.amount, { case: c.id, r: d.r });
  else if (d.kind === 'scratch') { l.tk = { ...(l.tk || {}) }; l.tk[d.t] = (l.tk[d.t] || 0) + d.n; }
  else if (d.kind === 'boost') {
    l.boosts = activeBoosts(p, now);
    const same = l.boosts.find((b) => b.g === d.game && b.m === d.m);
    if (same) same.u += d.h * 3600000; else l.boosts.push({ g: d.game, m: d.m, u: now + d.h * 3600000 });
  } else if (['farm', 'seed', 'speed', 'rush'].includes(d.kind)) {
    p.farm = F.normalize(p.farm);
    F.tick(p.farm);
    if (d.kind === 'farm') F.addBoost(p.farm, d.m, d.h);
    else if (d.kind === 'seed') p.farm.seeds = (p.farm.seeds || 0) + d.n;
    else if (d.kind === 'speed') p.farm.spd = Math.min(F.SPEED_MAX, Math.round(((p.farm.spd || 0) + d.s) * 1000) / 1000);
    else p.farm.q.forEach((q) => { q.end = Math.min(q.end, now); });
  } else if (d.kind === 'perm') l.perm = Math.round(((l.perm || 0) + d.perm) * 1000) / 1000;
  else if (d.kind === 'cos') p.shop = { owned: { ...((p.shop && p.shop.owned) || {}), [d.cos]: now }, eq: { ...((p.shop && p.shop.eq) || {}) } };
  p.stats.casesOpened = (p.stats.casesOpened || 0) + 1;
  wallet.touch({ type: 'loot', case: c.id, r: d.r, kind: d.kind, amount: d.amount || 0 });
}

// Tickets à gratter gagnés dans les caisses
export const freeTickets = (p, t) => (p && p.loot && p.loot.tk && p.loot.tk[t]) || 0;
export function useTicket(wallet, t) {
  const l = wallet.p.loot;
  if (!freeTickets(wallet.p, t)) return false;
  l.tk = { ...l.tk, [t]: l.tk[t] - 1 };
  wallet.credit('loot', TICKETS[t][1], { ticket: t }); // le ticket est payé avec ces Brundles (mise normale ensuite)
  return true;
}

// Branché sur le portefeuille, après chaque gain de mini-jeu : boost « tous les mini-jeux » des caisses
// (stats.lootfreeTotal) et bonus du cadre équipé (stats.cosmeticTotal), versés à part
export function initLoot(wallet) {
  wallet.lootBonus = (game, amount) => {
    if (!(amount > 0)) return 0;
    let extra = 0;
    const m = boostMult(wallet.p, game);
    if (m > 1) { const x = Math.round(amount * (m - 1)); wallet.credit('lootfree', x, { game, mult: m }); extra += x; }
    const cb = cosBonus(wallet.p, 'free');
    if (cb > 0) { const x = Math.round(amount * cb); if (x > 0) { wallet.credit('cosmetic', x, { game }); extra += x; } }
    return extra;
  };
  return { destroy() { wallet.lootBonus = null; } };
}
