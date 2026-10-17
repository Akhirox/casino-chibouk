// Caisses (lootboxes façon « case opening ») : contenu, tirage, application des gains, boosts temporaires et permanents.
// Tout est tiré et appliqué dans le navigateur (comme les jeux), au moment du clic ; l'animation ne fait que le montrer.
import { randInt } from './games/slots-math.js';
import * as F from './farm-core.js';
import { LOOT_ITEMS } from './shop.js';

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
const COS_TIER = { rare: 'purple', epic: 'pink', legend: 'red', mythic: 'gold' };

// Mini-jeux qui peuvent recevoir un boost (clé = jeu, icône du menu)
export const BOOST_GAMES = {
  sudoku: ['Sudoku', 'sudoku'], queens: ['Queens', 'queens'], tango: ['Tango', 'tango'], pinpoint: ['Pinpoint', 'pinpoint'],
  demineur: ['Démineur', 'demineur'], snake: ['Snake', 'snake'], memory: ['Memory', 'memory'], crossword: ['Mots croisés', 'crossword'],
  quiz: ['Calcul mental', 'quiz'], capitals: ['Quiz capitales', 'globe'], flags: ['Quiz drapeaux', 'flag'], movies: ['Quiz ciné', 'film'],
  higher: ['Plus ou moins', 'higher'], breaker: ['Casse-briques', 'breaker'], motus: ['Mot du jour', 'motus'],
};
export const PERM_MAX = 0.5; // bonus permanent plafonné à +50 %

// k = multiplicateur des gains en Brundles (valeur moyenne en Brundles = 56 % × k du prix, voir valueOf)
// perm = bonus permanent du lot mythique ; hue = couleur de la caisse
export const CASES = [
  { id: 'banane', name: 'Caisse Banane', price: 5000, k: 1.2, perm: 0.01, hue: '#f5c542', desc: 'Pour découvrir : beaucoup de boosts de mini-jeux.' },
  { id: 'jungle', name: 'Caisse Jungle', price: 50000, k: 1.4, perm: 0.02, hue: '#3ddc84', desc: 'Plus de Brundles, des boosts plus longs.' },
  { id: 'singe', name: 'Caisse Singe d\'Or', price: 500000, k: 1.55, perm: 0.03, hue: '#ff8a3d', desc: 'Pour les gros joueurs.' },
  { id: 'roi', name: 'Caisse du Roi', price: 5000000, k: 1.65, perm: 0.05, hue: '#c77dff', desc: 'La plus généreuse : +5 % permanent en mythique.' },
];
export const caseById = (id) => CASES.find((c) => c.id === id);

// Contenu (le même pour toutes les caisses ; les montants dépendent du prix et de k)
// kind : br (Brundles, x × prix × k), boost (mini-jeu : game '*' = au hasard, 'all' = tous), farm (production ×m),
//        seed (graine d'or de la ferme), perm (bonus permanent), cos (cosmétique exclusif de cette rareté)
export const POOL = [
  { r: 'blue', w: 3, kind: 'br', x: 0.3 },
  { r: 'blue', w: 3, kind: 'br', x: 0.5 },
  { r: 'blue', w: 2, kind: 'br', x: 0.7 },
  { r: 'blue', w: 2, kind: 'boost', game: '*', m: 1.5, h: 1 },
  { r: 'blue', w: 1, kind: 'farm', m: 1.5, h: 2 },
  { r: 'purple', w: 3, kind: 'br', x: 1.2 },
  { r: 'purple', w: 2, kind: 'br', x: 1.8 },
  { r: 'purple', w: 2, kind: 'boost', game: '*', m: 2, h: 2 },
  { r: 'purple', w: 1, kind: 'farm', m: 2, h: 4 },
  { r: 'purple', w: 1, kind: 'cos' },
  { r: 'pink', w: 2, kind: 'br', x: 4 },
  { r: 'pink', w: 1, kind: 'br', x: 6 },
  { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 2, h: 2 },
  { r: 'pink', w: 1, kind: 'boost', game: '*', m: 3, h: 12 },
  { r: 'pink', w: 1, kind: 'farm', m: 2, h: 12 },
  { r: 'pink', w: 1, kind: 'cos' },
  { r: 'red', w: 2, kind: 'br', x: 15 },
  { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: 24 },
  { r: 'red', w: 1, kind: 'seed' },
  { r: 'red', w: 1, kind: 'cos' },
  { r: 'gold', w: 1, kind: 'br', x: 60 },
  { r: 'gold', w: 1, kind: 'perm' },
  { r: 'gold', w: 1, kind: 'cos' },
];
const DUP_X = { purple: 1.5, pink: 5, red: 15, gold: 60 }; // cosmétique déjà possédé → Brundles
export const brAmount = (c, x) => Math.round(c.price * c.k * x);
const tierItems = (r) => POOL.filter((it) => it.r === r);
const wsum = (list) => list.reduce((a, it) => a + it.w, 0);
// Probabilité d'un lot du contenu
export const chanceOf = (it) => (RARITIES[it.r].w / R_TOTAL) * (it.w / wsum(tierItems(it.r)));
// Valeur moyenne en Brundles d'une caisse (hors boosts, cosmétiques, graines et bonus permanents)
export const valueOf = (c) => POOL.filter((it) => it.kind === 'br').reduce((a, it) => a + chanceOf(it) * brAmount(c, it.x), 0);

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
  return concrete(c, pickWeighted(tierItems(r), rnd), p, rnd);
}
// Lot d'une rareté donnée (décor de la bande animée)
export const drawTier = (c, r, rnd = randInt) => concrete(c, pickWeighted(tierItems(r), rnd), null, rnd);
function concrete(c, it, p, rnd = randInt) {
  const d = { r: it.r, kind: it.kind };
  if (it.kind === 'br') d.amount = brAmount(c, it.x);
  else if (it.kind === 'boost') { d.game = it.game === '*' ? Object.keys(BOOST_GAMES)[rnd(Object.keys(BOOST_GAMES).length)] : it.game; d.m = it.m; d.h = it.h; }
  else if (it.kind === 'farm') { d.m = it.m; d.h = it.h; }
  else if (it.kind === 'perm') {
    d.perm = c.perm;
    const cur = (p && p.loot && p.loot.perm) || 0;
    if (p && cur >= PERM_MAX - 1e-9) { d.kind = 'br'; d.amount = brAmount(c, 60); d.capped = true; }
  } else if (it.kind === 'cos') {
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
  switch (d.kind) {
    case 'br': return { title: Math.round(d.amount).toLocaleString('fr-FR'), sub: d.capped ? 'Brundles (bonus permanent au maximum)' : 'Brundles', icon: 'coin' };
    case 'boost': return d.game === 'all'
      ? { title: `${fx(d.m)} mini-jeux`, sub: `tous les mini-jeux · ${d.h} h`, icon: 'gift' }
      : { title: `${fx(d.m)} ${BOOST_GAMES[d.game][0]}`, sub: `gains du jeu · ${d.h} h`, icon: BOOST_GAMES[d.game][1] };
    case 'farm': return { title: `Ferme ${fx(d.m)}`, sub: `production · ${d.h} h`, icon: 'banana' };
    case 'seed': return { title: 'Graine d\'or', sub: '+5 % de bananes, pour toujours', icon: 'seed' };
    case 'perm': return { title: `+${Math.round(d.perm * 100)} % permanent`, sub: 'sur tous les gains gratuits', icon: 'star' };
    case 'cos': return { title: d.name, sub: d.dup ? `déjà possédé · +${Math.round(d.amount).toLocaleString('fr-FR')} Brundles` : `${COS_CAT[d.cat] || 'Cosmétique'} exclusif`, icon: { frame: 'user', title: 'medal', cardback: 'blackjack', theme: 'slots', effect: 'bolt' }[d.cat] || 'gift' };
  }
  return { title: '?', sub: '', icon: 'gift' };
}
// Texte générique d'une ligne du contenu
export function poolLabel(c, it) {
  if (it.kind === 'boost' && it.game === '*') return { title: `×${String(it.m).replace('.', ',')} un mini-jeu`, sub: `au hasard · ${it.h} h`, icon: 'gift' };
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
  else if (d.kind === 'boost') {
    l.boosts = activeBoosts(p, now);
    const same = l.boosts.find((b) => b.g === d.game && b.m === d.m);
    if (same) same.u += d.h * 3600000; else l.boosts.push({ g: d.game, m: d.m, u: now + d.h * 3600000 });
  } else if (d.kind === 'farm' || d.kind === 'seed') {
    p.farm = F.normalize(p.farm);
    F.tick(p.farm);
    if (d.kind === 'farm') F.addBoost(p.farm, d.m, d.h); else p.farm.seeds = (p.farm.seeds || 0) + 1;
  } else if (d.kind === 'perm') l.perm = Math.min(PERM_MAX, Math.round(((l.perm || 0) + d.perm) * 1000) / 1000);
  else if (d.kind === 'cos') p.shop = { owned: { ...((p.shop && p.shop.owned) || {}), [d.cos]: now }, eq: { ...((p.shop && p.shop.eq) || {}) } };
  p.stats.casesOpened = (p.stats.casesOpened || 0) + 1;
  wallet.touch({ type: 'loot', case: c.id, r: d.r, kind: d.kind, amount: d.amount || 0 });
}

// Branché sur le portefeuille : bonus des boosts de mini-jeux, versé à part (stats.lootfreeTotal)
export function initLoot(wallet) {
  wallet.lootBonus = (game, amount) => {
    const m = boostMult(wallet.p, game);
    if (!(m > 1) || !(amount > 0)) return 0;
    const extra = Math.round(amount * (m - 1));
    wallet.credit('lootfree', extra, { game, mult: m });
    return extra;
  };
  return { destroy() { wallet.lootBonus = null; } };
}
