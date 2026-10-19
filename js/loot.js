// Caisses (V27) : contenu, tirage, application des lots, boosts temporaires (empilables) et bonus permanents.
// Tout est tiré et appliqué dans le navigateur au moment du clic ; l'animation ne fait que le montrer.
//
// Familles :
//  - Fermier (3 caisses) : boosts temporaires de la ferme (récolte, vente), chantiers, et pour la plus chère du permanent
//  - Mini-jeux (3 caisses) : boosts « tous les mini-jeux » et « défis », EMPILABLES (dégressif, plafonné), tours de roue
//  - Cosmétiques (3 coffrets) : les cosmétiques de la boutique ; un objet déjà possédé est remboursé à sa valeur boutique
//  - Brundles (4 caisses) : 3 « gros risque, gros gain » + 1 quitte ou double (51 % rien / 49 % ×2)
//  - Royales (5 coffres, dès 50 000) : uniquement des bonus permanents sur les gains (coffre, roue du jour, défis, gains
//    gratuits, ferme), meilleurs dans les coffres plus chers.
// Aucun lot ne touche au rakeback : on ne doit jamais pouvoir miser à l'infini et tout récupérer.
import { randInt } from './games/slots-math.js';
import * as F from './farm-core.js';
import { ITEMS, LOOT_ITEMS } from './shop.js';
import { cosBonus } from './bonus.js';

const COS_CAT = { frame: 'Cadre', title: 'Titre', cardback: 'Dos de cartes', theme: 'Thème de slot', effect: 'Effet de victoire' };

// Raretés (le plus rare : 0,3 %)
export const RARITIES = {
  blue: { name: 'Commun', color: '#4b69ff', w: 70000 },
  purple: { name: 'Rare', color: '#8847ff', w: 22000 },
  pink: { name: 'Épique', color: '#d32ce6', w: 6000 },
  red: { name: 'Légendaire', color: '#eb4b4b', w: 1700 },
  gold: { name: 'Mythique', color: '#e4ae39', w: 300 },
};
const R_TOTAL = 100000;
export const R_ORDER = ['blue', 'purple', 'pink', 'red', 'gold'];
const DEFAULT_ODDS = Object.fromEntries(R_ORDER.map((r) => [r, RARITIES[r].w]));

// anciens boosts sur un seul mini-jeu (encore affichés tant qu'ils courent)
export const BOOST_GAMES = {
  sudoku: ['Sudoku', 'sudoku'], queens: ['Queens', 'queens'], tango: ['Tango', 'tango'], pinpoint: ['Pinpoint', 'pinpoint'],
  demineur: ['Démineur', 'demineur'], snake: ['Snake', 'snake'], memory: ['Memory', 'memory'], crossword: ['Mots croisés', 'crossword'],
  quiz: ['Calcul mental', 'quiz'], capitals: ['Quiz capitales', 'globe'], flags: ['Quiz drapeaux', 'flag'], movies: ['Quiz ciné', 'film'],
  higher: ['Plus ou moins', 'higher'], breaker: ['Casse-briques', 'breaker'], motus: ['Mot du jour', 'motus'],
};
export const TICKETS = { banane: ['Banane Express', 10], singe: ['Singe d\'Or', 100], tresor: ['Trésor de la Jungle', 1000] };

// Plafonds des bonus permanents (gains gratuits : sans plafond)
export const PERM_MAX = Infinity;
export const PERM_CAP = { vault: 1, sell: 1, wheel: 3, chalp: 2 };
export const PERM_LABEL = { perm: 'gains gratuits', vault: 'intérêts du coffre', sell: 'vente des bananes', wheel: 'roue du jour', chalp: 'défis de la jungle' };

// Empilement des boosts temporaires : le plus fort compte en entier, le 2e aux 3/4, le 3e au quart, puis de moins en moins.
// Deux ×3 → ×4,5 ; trois ×3 → ×5 ; plafonds par type.
export const STACK_W = [1, 0.75, 0.25, 0.125, 0.0625];
export const STACK_CAP = { all: 6, chal: 3, sell: 3 };
export function stackMult(ms, cap = Infinity) {
  const s = ms.filter((m) => m > 1).sort((a, b) => b - a);
  let t = 1;
  s.forEach((m, i) => { t += (m - 1) * (i < STACK_W.length ? STACK_W[i] : STACK_W.at(-1) / 2 ** (i - STACK_W.length + 1)); });
  return Math.min(cap, Math.round(t * 100) / 100);
}

/* ------------------------------------------------------------------------------------------------ */
// Valeur d'un cosmétique (prix boutique ; objets exclusifs : valeur fixe selon leur rareté)
const LOOT_VALUE = { common: 30000, rare: 300000, epic: 1500000, legend: 6000000, mythic: 30000000 };
export const itemValue = (it) => (it && (it.price || LOOT_VALUE[it.loot])) || 0;

const H = (m) => m / 60; // minutes → heures
// x = Brundles en multiple du prix ; h = durée (heures) ; v = bonus permanent
export const CASES = [
  /* ---------------- Fermier ---------------- */
  { id: 'panier', fam: 'farm', name: 'Panier du Fermier', price: 2000, hue: '#a9d65a', desc: 'Boosts de récolte de quelques minutes à 2 h.',
    pool: [
      { r: 'blue', w: 2, kind: 'br', x: 0.35 }, { r: 'blue', w: 2, kind: 'br', x: 0.6 }, { r: 'blue', w: 3, kind: 'farm', m: 1.5, h: H(15) }, { r: 'blue', w: 2, kind: 'boost', game: 'sell', m: 1.25, h: H(30) },
      { r: 'purple', w: 1, kind: 'br', x: 1.3 }, { r: 'purple', w: 2, kind: 'farm', m: 2, h: H(30) }, { r: 'purple', w: 2, kind: 'farm', m: 1.5, h: 1 }, { r: 'purple', w: 1, kind: 'boost', game: 'sell', m: 1.5, h: 1 },
      { r: 'pink', w: 1, kind: 'br', x: 3 }, { r: 'pink', w: 2, kind: 'farm', m: 2, h: 2 }, { r: 'pink', w: 1, kind: 'rush' },
      { r: 'red', w: 1, kind: 'br', x: 8 }, { r: 'red', w: 1, kind: 'farm', m: 3, h: 1 }, { r: 'red', w: 1, kind: 'farm', m: 2, h: 4 },
      { r: 'gold', w: 1, kind: 'br', x: 30 }, { r: 'gold', w: 1, kind: 'farm', m: 3, h: 4 },
    ] },
  { id: 'brouette', fam: 'farm', name: 'Brouette du Fermier', price: 10000, hue: '#7fbf3f', desc: 'Boosts de récolte et de vente de quelques heures à 12 h.',
    pool: [
      { r: 'blue', w: 2, kind: 'br', x: 0.35 }, { r: 'blue', w: 2, kind: 'br', x: 0.6 }, { r: 'blue', w: 3, kind: 'farm', m: 1.5, h: 1 }, { r: 'blue', w: 2, kind: 'boost', game: 'sell', m: 1.25, h: 2 },
      { r: 'purple', w: 1, kind: 'br', x: 1.3 }, { r: 'purple', w: 2, kind: 'farm', m: 2, h: 2 }, { r: 'purple', w: 2, kind: 'farm', m: 1.5, h: 4 }, { r: 'purple', w: 1, kind: 'boost', game: 'sell', m: 1.5, h: 4 }, { r: 'purple', w: 1, kind: 'rush' },
      { r: 'pink', w: 1, kind: 'br', x: 3 }, { r: 'pink', w: 2, kind: 'farm', m: 2, h: 6 }, { r: 'pink', w: 1, kind: 'farm', m: 3, h: 2 }, { r: 'pink', w: 1, kind: 'boost', game: 'sell', m: 2, h: 6 },
      { r: 'red', w: 1, kind: 'br', x: 8 }, { r: 'red', w: 1, kind: 'farm', m: 2, h: 12 }, { r: 'red', w: 1, kind: 'farm', m: 3, h: 6 },
      { r: 'gold', w: 1, kind: 'br', x: 30 }, { r: 'gold', w: 1, kind: 'farm', m: 3, h: 12 }, { r: 'gold', w: 1, kind: 'seed', n: 1 },
    ] },
  { id: 'grange', fam: 'farm', name: 'Grange du Fermier', price: 20000, hue: '#4f9d2a', desc: 'Boosts longs, graines d\'or, vitesse de construction.',
    pool: [
      { r: 'blue', w: 2, kind: 'br', x: 0.35 }, { r: 'blue', w: 2, kind: 'br', x: 0.6 }, { r: 'blue', w: 3, kind: 'farm', m: 1.5, h: 6 }, { r: 'blue', w: 2, kind: 'boost', game: 'sell', m: 1.5, h: 6 },
      { r: 'purple', w: 1, kind: 'br', x: 1.3 }, { r: 'purple', w: 2, kind: 'farm', m: 2, h: 12 }, { r: 'purple', w: 1, kind: 'boost', game: 'sell', m: 1.5, h: 24 }, { r: 'purple', w: 1, kind: 'speed', s: 0.01 }, { r: 'purple', w: 1, kind: 'rush' },
      { r: 'pink', w: 2, kind: 'farm', m: 2, h: 48 }, { r: 'pink', w: 1, kind: 'farm', m: 3, h: 12 }, { r: 'pink', w: 1, kind: 'seed', n: 1 }, { r: 'pink', w: 1, kind: 'sell', v: 0.02 },
      { r: 'red', w: 1, kind: 'farm', m: 3, h: 48 }, { r: 'red', w: 1, kind: 'seed', n: 2 }, { r: 'red', w: 1, kind: 'speed', s: 0.05 },
      { r: 'gold', w: 1, kind: 'seed', n: 5 }, { r: 'gold', w: 1, kind: 'farm', m: 3, h: 168 }, { r: 'gold', w: 1, kind: 'speed', s: 0.1 },
    ] },
  /* ---------------- Mini-jeux (boosts empilables) ---------------- */
  { id: 'sachet', fam: 'mini', name: 'Sachet du Joueur', price: 2000, hue: '#5fd0ff', desc: 'Boosts de mini-jeux et de défis de 15 min à 3 h.',
    pool: [
      { r: 'blue', w: 2, kind: 'br', x: 0.35 }, { r: 'blue', w: 2, kind: 'br', x: 0.6 }, { r: 'blue', w: 3, kind: 'boost', game: 'all', m: 1.5, h: H(15) }, { r: 'blue', w: 2, kind: 'boost', game: 'chal', m: 1.5, h: H(30) },
      { r: 'purple', w: 1, kind: 'br', x: 1.3 }, { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 2, h: H(15) }, { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 1.5, h: 1 }, { r: 'purple', w: 1, kind: 'spin', n: 1 },
      { r: 'pink', w: 1, kind: 'br', x: 3 }, { r: 'pink', w: 2, kind: 'boost', game: 'all', m: 2, h: 1 }, { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 3, h: H(15) }, { r: 'pink', w: 1, kind: 'boost', game: 'chal', m: 2, h: 1 },
      { r: 'red', w: 1, kind: 'br', x: 8 }, { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: 1 }, { r: 'red', w: 1, kind: 'spin', n: 2 },
      { r: 'gold', w: 1, kind: 'br', x: 30 }, { r: 'gold', w: 1, kind: 'boost', game: 'all', m: 3, h: 3 },
    ] },
  { id: 'boite', fam: 'mini', name: 'Boîte du Joueur', price: 10000, hue: '#2fb1ff', desc: 'Boosts de mini-jeux et de défis de 1 h à 12 h, tours de roue.',
    pool: [
      { r: 'blue', w: 2, kind: 'br', x: 0.35 }, { r: 'blue', w: 2, kind: 'br', x: 0.6 }, { r: 'blue', w: 3, kind: 'boost', game: 'all', m: 1.5, h: 1 }, { r: 'blue', w: 2, kind: 'boost', game: 'chal', m: 1.5, h: 2 },
      { r: 'purple', w: 1, kind: 'br', x: 1.3 }, { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 2, h: 2 }, { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 1.5, h: 6 }, { r: 'purple', w: 1, kind: 'spin', n: 1 },
      { r: 'pink', w: 1, kind: 'br', x: 3 }, { r: 'pink', w: 2, kind: 'boost', game: 'all', m: 2, h: 6 }, { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 3, h: 2 }, { r: 'pink', w: 1, kind: 'boost', game: 'chal', m: 2, h: 6 }, { r: 'pink', w: 1, kind: 'spin', n: 2 },
      { r: 'red', w: 1, kind: 'br', x: 8 }, { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: 6 }, { r: 'red', w: 1, kind: 'boost', game: 'all', m: 2, h: 12 }, { r: 'red', w: 1, kind: 'spin', n: 3 },
      { r: 'gold', w: 1, kind: 'br', x: 30 }, { r: 'gold', w: 1, kind: 'boost', game: 'all', m: 3, h: 12 }, { r: 'gold', w: 1, kind: 'perm', v: 0.01 },
    ] },
  { id: 'malle', fam: 'mini', name: 'Malle du Joueur', price: 20000, hue: '#1f6fd6', desc: 'Boosts longs (jusqu\'à 7 jours) et bonus permanents.',
    pool: [
      { r: 'blue', w: 2, kind: 'br', x: 0.35 }, { r: 'blue', w: 2, kind: 'br', x: 0.6 }, { r: 'blue', w: 3, kind: 'boost', game: 'all', m: 1.5, h: 6 }, { r: 'blue', w: 2, kind: 'boost', game: 'chal', m: 1.5, h: 6 },
      { r: 'purple', w: 1, kind: 'br', x: 1.3 }, { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 2, h: 12 }, { r: 'purple', w: 1, kind: 'boost', game: 'chal', m: 2, h: 12 }, { r: 'purple', w: 1, kind: 'spin', n: 2 },
      { r: 'pink', w: 2, kind: 'boost', game: 'all', m: 3, h: 12 }, { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 2, h: 48 }, { r: 'pink', w: 1, kind: 'perm', v: 0.005 },
      { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: 48 }, { r: 'red', w: 1, kind: 'perm', v: 0.015 }, { r: 'red', w: 1, kind: 'spin', n: 5 },
      { r: 'gold', w: 1, kind: 'boost', game: 'all', m: 3, h: 168 }, { r: 'gold', w: 1, kind: 'perm', v: 0.04 },
    ] },
  /* ---------------- Cosmétiques (contenu calculé plus bas) ---------------- */
  { id: 'elegance', fam: 'cos', name: 'Coffret Élégance', min: 1, max: 100000, hue: '#ff9ad5', desc: 'Les cosmétiques jusqu\'à 100 000.' },
  { id: 'prestige', fam: 'cos', name: 'Coffret Prestige', min: 100001, max: 2000000, hue: '#ff6fb5', desc: 'De 100 000 à 2 millions, et des exclusifs.' },
  { id: 'legende', fam: 'cos', name: 'Coffret Légende', min: 1500000, max: Infinity, hue: '#d4357f', desc: 'Les plus chers et les exclusifs les plus rares.' },
  /* ---------------- Brundles ---------------- */
  { id: 'banco', fam: 'br', name: 'Caisse Banco', price: 10000, ev: 0.95, hue: '#ffb03d', desc: 'Gros risque : jusqu\'à ×40.',
    pool: [
      { r: 'blue', w: 3, kind: 'br', x: 0.15 }, { r: 'blue', w: 3, kind: 'br', x: 0.3 }, { r: 'blue', w: 2, kind: 'br', x: 0.45 },
      { r: 'purple', w: 2, kind: 'br', x: 1 }, { r: 'purple', w: 1, kind: 'br', x: 1.8 }, { r: 'pink', w: 1, kind: 'br', x: 3.5 }, { r: 'red', w: 1, kind: 'br', x: 8 }, { r: 'gold', w: 1, kind: 'br', x: 40 },
    ] },
  { id: 'jackpot', fam: 'br', name: 'Caisse Jackpot', price: 100000, ev: 0.95, hue: '#ff7a3d', desc: 'Très gros risque : jusqu\'à ×70.',
    pool: [
      { r: 'blue', w: 3, kind: 'br', x: 0.05 }, { r: 'blue', w: 3, kind: 'br', x: 0.1 }, { r: 'blue', w: 2, kind: 'br', x: 0.2 },
      { r: 'purple', w: 1, kind: 'br', x: 0.8 }, { r: 'pink', w: 1, kind: 'br', x: 4 }, { r: 'red', w: 1, kind: 'br', x: 15 }, { r: 'gold', w: 1, kind: 'br', x: 70 },
    ] },
  { id: 'allin', fam: 'br', name: 'Caisse All-in', price: 1000000, ev: 0.95, hue: '#ff4d5e', desc: 'Presque toujours perdu… jusqu\'à ×150.',
    pool: [
      { r: 'blue', w: 3, kind: 'br', x: 0 }, { r: 'blue', w: 3, kind: 'br', x: 0.03 }, { r: 'blue', w: 2, kind: 'br', x: 0.08 },
      { r: 'purple', w: 1, kind: 'br', x: 0.4 }, { r: 'pink', w: 1, kind: 'br', x: 2.5 }, { r: 'red', w: 1, kind: 'br', x: 15 }, { r: 'gold', w: 1, kind: 'br', x: 150 },
    ] },
  { id: 'qod', fam: 'br', name: 'Quitte ou double', price: 50000, k: 1, hue: '#c0c9d0', desc: '51 % : rien. 49 % : le double.', odds: { blue: 51000, red: 49000 },
    pool: [{ r: 'blue', w: 1, kind: 'br', x: 0 }, { r: 'red', w: 1, kind: 'br', x: 2 }] },
  /* ---------------- Royales : uniquement des bonus permanents ---------------- */
  { id: 'baron', fam: 'royal', name: 'Coffre du Baron', price: 50000, f: 1, hue: '#c9a227', desc: 'Bonus permanents sur tes gains.' },
  { id: 'comte', fam: 'royal', name: 'Coffre du Comte', price: 200000, f: 3, hue: '#d4a017', desc: 'Bonus permanents 3 fois plus gros.' },
  { id: 'duc', fam: 'royal', name: 'Coffre du Duc', price: 1000000, f: 10, hue: '#e8b923', desc: 'Bonus permanents 10 fois plus gros.' },
  { id: 'prince', fam: 'royal', name: 'Coffre du Prince', price: 5000000, f: 35, hue: '#f5c542', desc: 'Bonus permanents 35 fois plus gros.' },
  { id: 'roisinge', fam: 'royal', name: 'Coffre du Roi Singe', price: 25000000, f: 120, hue: '#fff0a8', desc: 'Les plus gros bonus permanents du casino.' },
];
export const FAMILIES = [
  ['farm', 'Caisses du Fermier', 'Boosts temporaires de la ferme (récolte et vente), chantiers terminés ; graines d\'or et vitesse de construction dans la Grange.'],
  ['mini', 'Caisses Mini-jeux', 'Boosts de tous les mini-jeux et des défis. Ils s\'empilent : deux ×3 donnent ×4,5, trois ×5, jusqu\'à ×6.'],
  ['cos', 'Coffrets Cosmétiques', 'Les cosmétiques de la boutique (un peu plus cher en moyenne que de les acheter, mais avec une chance de gros lot). Déjà possédé : remboursé à sa valeur boutique.'],
  ['br', 'Caisses Brundles', 'Que des Brundles : gros risque, gros gain. Et le quitte ou double.'],
  ['royal', 'Coffres Royaux', 'Uniquement des bonus permanents : intérêts du coffre, roue du jour, défis, gains gratuits, vente des bananes, graines d\'or. Toujours un bonus à la clé.'],
];
export const caseById = (id) => CASES.find((c) => c.id === id);

// Coffres royaux : bonus de base (×f selon le coffre)
const ROYAL = {
  blue: [['vault', 0.01], ['wheel', 0.05], ['chalp', 0.03], ['perm', 0.003], ['sell', 0.02]],
  purple: [['vault', 0.025], ['wheel', 0.12], ['chalp', 0.08], ['perm', 0.008], ['sell', 0.05], ['seed', 1]],
  pink: [['vault', 0.06], ['wheel', 0.3], ['chalp', 0.2], ['perm', 0.02], ['seed', 2]],
  red: [['vault', 0.15], ['wheel', 0.75], ['chalp', 0.5], ['perm', 0.05], ['seed', 5]],
  gold: [['vault', 0.4], ['wheel', 2], ['chalp', 1.2], ['perm', 0.12], ['seed', 12]],
};
const r4 = (x) => Math.round(x * 10000) / 10000;
function buildRoyal(c) {
  const seedF = Math.ceil(c.f ** 0.6);
  return R_ORDER.flatMap((r) => ROYAL[r].map(([kind, v]) => (kind === 'seed' ? { r, w: 1, kind, n: v * seedF } : { r, w: 1, kind, v: r4(Math.min(PERM_CAP[kind] ?? Infinity, v * c.f)) })));
}
// Coffrets cosmétiques : chaque objet de la gamme de prix, avec une chance inversement proportionnelle à sa valeur.
// Prix du coffret = valeur moyenne d'un tirage ÷ 0,88 (un peu plus cher en moyenne que d'acheter en boutique).
function buildCos(c) {
  const items = ITEMS.filter((it) => { const v = itemValue(it); return v >= c.min && v <= c.max; });
  const inv = items.reduce((a, it) => a + 1 / itemValue(it), 0);
  const ev = items.length / inv;
  c.price = c.price || Math.round(ev / 0.88 / 1000) * 1000;
  c.k = 1;
  return items.map((it) => {
    const p = (1 / itemValue(it)) / inv;
    const r = p >= 0.1 ? 'blue' : p >= 0.03 ? 'purple' : p >= 0.01 ? 'pink' : p >= 0.003 ? 'red' : 'gold';
    return { r, w: Math.round(1e9 * p), kind: 'cos', id: it.id };
  });
}
// Contenu d'une caisse
const POOLS = new Map();
export function poolOf(c) {
  if (!POOLS.has(c.id)) POOLS.set(c.id, c.fam === 'cos' ? buildCos(c) : c.fam === 'royal' ? buildRoyal(c) : c.pool);
  return POOLS.get(c.id);
}
export const oddsOf = (c) => c.odds || DEFAULT_ODDS;
const wsum = (list) => list.reduce((a, it) => a + it.w, 0);
const tierItems = (c, r) => poolOf(c).filter((it) => it.r === r);
// Probabilité d'un lot
export function chanceOf(c, it) {
  if (c.fam === 'cos') return it.w / wsum(poolOf(c));
  return (oddsOf(c)[it.r] / R_TOTAL) * (it.w / wsum(tierItems(c, it.r)));
}
export const brAmount = (c, x) => Math.round(c.price * (c.k ?? 1) * x);
// Valeur moyenne en Brundles d'un tirage (Brundles + valeur boutique des cosmétiques)
export const valueOf = (c) => poolOf(c).reduce((a, it) => a + chanceOf(c, it) * (it.kind === 'br' ? brAmount(c, it.x) : it.kind === 'cos' ? itemValue(ITEMS.find((x) => x.id === it.id)) : 0), 0);
// k des caisses Brundles calculé pour rendre « ev » du prix en moyenne
for (const c of CASES) {
  if (c.fam === 'cos') poolOf(c);
  if (c.ev) { c.k = 1; c.k = Math.round((c.ev * c.price / valueOf(c)) * 10000) / 10000; }
}

function pickWeighted(list, rnd = randInt) {
  let n = rnd(wsum(list));
  for (const it of list) { if (n < it.w) return it; n -= it.w; }
  return list[list.length - 1];
}
function rollItem(c, rnd = randInt) {
  if (c.fam === 'cos') return pickWeighted(poolOf(c), rnd);
  const o = oddsOf(c);
  let n = rnd(R_TOTAL), r = 'blue';
  for (const k of R_ORDER) { if (n < (o[k] || 0)) { r = k; break; } n -= o[k] || 0; }
  return pickWeighted(tierItems(c, r), rnd);
}
// Tirage d'un lot concret. p = profil (doublons de cosmétiques, plafonds) ; sans p : lot plausible pour la bande animée.
export const draw = (c, p = null, rnd = randInt) => concrete(c, rollItem(c, rnd), p);
export function drawTier(c, r, rnd = randInt) {
  const list = c.fam === 'cos' ? poolOf(c).filter((it) => it.r === r) : tierItems(c, r);
  return list.length ? concrete(c, pickWeighted(list, rnd), null) : draw(c, null, rnd);
}
function concrete(c, it, p) {
  const d = { r: it.r, kind: it.kind };
  if (it.kind === 'br') d.amount = brAmount(c, it.x);
  else if (it.kind === 'boost') { d.game = it.game; d.m = it.m; d.h = it.h; }
  else if (it.kind === 'farm') { d.m = it.m; d.h = it.h; }
  else if (it.kind === 'seed' || it.kind === 'spin') d.n = it.n;
  else if (it.kind === 'speed') {
    d.s = it.s;
    if (p && ((p.farm && p.farm.spd) || 0) >= F.SPEED_MAX - 1e-9) { d.kind = 'perm'; d.v = r4(0.002 * (R_ORDER.indexOf(it.r) + 1)); d.capped = 'speed'; }
  } else if (PERM_LABEL[it.kind]) {
    d.v = it.v;
    // bonus déjà au plafond : remplacé par un bonus de gains gratuits (sans plafond) de même rareté
    if (p && PERM_CAP[it.kind] && ((p.loot && p.loot[it.kind]) || 0) >= PERM_CAP[it.kind] - 1e-9) {
      const base = c.fam === 'royal' ? ROYAL[it.r].find((x) => x[0] === 'perm')[1] * c.f : 0.003 * (R_ORDER.indexOf(it.r) + 1);
      d.kind = 'perm'; d.v = r4(base); d.capped = it.kind;
    }
  } else if (it.kind === 'cos') {
    const item = ITEMS.find((x) => x.id === it.id);
    d.cos = item.id; d.name = item.name; d.cat = item.cat; d.val = itemValue(item);
    if (p && p.shop && p.shop.owned && p.shop.owned[item.id]) { d.dup = true; d.amount = d.val; }
  }
  return d;
}

/* ------------------------------------------------------------------------------------------------ */
const fx = (m) => '×' + String(m).replace('.', ',');
const pc = (x) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';
export const durTxt = (h) => (h < 1 ? `${Math.round(h * 60)} min` : h >= 48 && h % 24 === 0 ? `${h / 24} jours` : `${h} h`);
// Texte d'un lot : { title, sub, icon }
export function labelOf(d) {
  switch (d.kind) {
    case 'br': return { title: Math.round(d.amount).toLocaleString('fr-FR'), sub: d.amount ? 'Brundles' : 'Rien du tout', icon: 'coin' };
    case 'scratch': return { title: `${d.n} ticket${d.n > 1 ? 's' : ''} à gratter`, sub: TICKETS[d.t][0], icon: 'scratch' };
    case 'boost':
      if (d.game === 'all') return { title: `${fx(d.m)} mini-jeux`, sub: `tous les mini-jeux · ${durTxt(d.h)}`, icon: 'gift' };
      if (d.game === 'chal') return { title: `${fx(d.m)} défis`, sub: `récompenses des défis · ${durTxt(d.h)}`, icon: 'flag' };
      if (d.game === 'sell') return { title: `Vente ${fx(d.m)}`, sub: `prix des bananes · ${durTxt(d.h)}`, icon: 'banana' };
      return { title: `${fx(d.m)} ${BOOST_GAMES[d.game] ? BOOST_GAMES[d.game][0] : d.game}`, sub: durTxt(d.h), icon: BOOST_GAMES[d.game] ? BOOST_GAMES[d.game][1] : 'gift' };
    case 'farm': return { title: `Récolte ${fx(d.m)}`, sub: `ferme · ${durTxt(d.h)}`, icon: 'banana' };
    case 'rush': return { title: 'Chantiers terminés', sub: 'tous tes chantiers en cours', icon: 'bolt' };
    case 'seed': return { title: d.n > 1 ? `${d.n} graines d'or` : 'Graine d\'or', sub: `+${5 * d.n} % de récolte, pour toujours`, icon: 'seed' };
    case 'speed': return { title: `Chantiers −${pc(d.s)}`, sub: 'durée de construction, pour toujours', icon: 'hourglass' };
    case 'spin': return { title: d.n > 1 ? `${d.n} tours de roue` : 'Tour de roue', sub: 'roue du jour en plus', icon: 'wheel' };
    case 'perm': return { title: `Gains gratuits +${pc(d.v)}`, sub: d.capped ? 'pour toujours (à la place d\'un bonus au maximum)' : 'pour toujours', icon: 'star' };
    case 'vault': return { title: `Coffre +${pc(d.v)}`, sub: 'd\'intérêts, pour toujours', icon: 'vault' };
    case 'sell': return { title: `Bananes +${pc(d.v)}`, sub: 'prix de vente, pour toujours', icon: 'banana' };
    case 'wheel': return { title: `Roue du jour +${pc(d.v)}`, sub: 'gains de la roue, pour toujours', icon: 'wheel' };
    case 'chalp': return { title: `Défis +${pc(d.v)}`, sub: 'récompenses des défis, pour toujours', icon: 'flag' };
    case 'cos': return { title: d.name, sub: d.dup ? `déjà possédé · remboursé ${Math.round(d.amount).toLocaleString('fr-FR')}` : `${COS_CAT[d.cat] || 'Cosmétique'} · valeur ${Math.round(d.val).toLocaleString('fr-FR')}`, icon: { frame: 'user', title: 'medal', cardback: 'blackjack', theme: 'slots', effect: 'bolt' }[d.cat] || 'gift' };
  }
  return { title: '?', sub: '', icon: 'gift' };
}
export const poolLabel = (c, it) => labelOf(concrete(c, it, null));

/* ------------------------------------------------------------------------------------------------ */
const lootOf = (p) => (p.loot = p.loot && typeof p.loot === 'object' ? p.loot : { boosts: [], perm: 0 });
export function activeBoosts(p, now = Date.now()) {
  const l = p && p.loot;
  return l && Array.isArray(l.boosts) ? l.boosts.filter((b) => b.u > now) : [];
}
const stackOf = (p, g, now) => stackMult(activeBoosts(p, now).filter((b) => b.g === g).map((b) => b.m), STACK_CAP[g] ?? 3);
// Mini-jeux : boosts « tous les mini-jeux » empilés (× anciens boosts sur un seul jeu, encore actifs)
export function boostMult(p, game, now = Date.now()) {
  const single = Math.max(1, ...activeBoosts(p, now).filter((b) => b.g === game).map((b) => b.m));
  return Math.round(stackOf(p, 'all', now) * single * 100) / 100;
}
export const chalBoost = (p, now = Date.now()) => stackOf(p, 'chal', now);
export const sellBoost = (p, now = Date.now()) => stackOf(p, 'sell', now);
export const lootPerm = (p, k) => Math.max(0, Math.min(PERM_CAP[k] ?? Infinity, (p && p.loot && p.loot[k]) || 0));

// Applique un lot (à appeler dans wallet.deferEvents pour ne le révéler qu'après l'animation)
export function applyDrop(wallet, c, d) {
  const p = wallet.p, l = lootOf(p), now = Date.now();
  l.opened = (l.opened || 0) + 1;
  if (R_ORDER.indexOf(d.r) > R_ORDER.indexOf(l.best || 'blue')) l.best = d.r;
  if (d.kind === 'br' || d.dup) { if (d.amount > 0) wallet.credit('loot', d.amount, { case: c.id, r: d.r }); }
  else if (d.kind === 'boost') { l.boosts = activeBoosts(p, now); l.boosts.push({ g: d.game, m: d.m, u: now + d.h * 3600000 }); }
  else if (['farm', 'seed', 'speed', 'rush'].includes(d.kind)) {
    p.farm = F.normalize(p.farm);
    F.tick(p.farm);
    if (d.kind === 'farm') F.addBoost(p.farm, d.m, d.h);
    else if (d.kind === 'seed') p.farm.seeds = (p.farm.seeds || 0) + d.n;
    else if (d.kind === 'speed') p.farm.spd = Math.min(F.SPEED_MAX, r4((p.farm.spd || 0) + d.s));
    else p.farm.q.forEach((q) => { q.end = Math.min(q.end, now); });
  } else if (d.kind === 'spin') l.spins = (l.spins || 0) + d.n;
  else if (PERM_LABEL[d.kind]) {
    if (d.kind === 'vault' && wallet.accrueVault) wallet.accrueVault(); // les intérêts déjà courus restent au taux d'avant
    l[d.kind] = Math.min(PERM_CAP[d.kind] ?? Infinity, r4((l[d.kind] || 0) + d.v));
  } else if (d.kind === 'cos') p.shop = { owned: { ...((p.shop && p.shop.owned) || {}), [d.cos]: now }, eq: { ...((p.shop && p.shop.eq) || {}) } };
  p.stats.casesOpened = (p.stats.casesOpened || 0) + 1;
  wallet.touch({ type: 'loot', case: c.id, r: d.r, kind: d.kind, amount: d.amount || 0 });
}

// Cadeau d'un admin (V29) : Brundles, boost de récolte, boosts temporaires (mini-jeux, défis, vente) ou tours de roue.
// g = { id, kind: 'br' | 'farm' | 'all' | 'chal' | 'sell' | 'spin', amount?, m?, h?, n?, msg? }
export function applyGift(wallet, g, now = Date.now()) {
  const p = wallet.p, l = lootOf(p);
  if (g.kind === 'br') { wallet.credit('gift', Math.max(0, Math.floor(g.amount || 0)), { msg: g.msg || '' }); return true; }
  if (g.kind === 'farm' && g.m > 1 && g.h > 0) { p.farm = F.normalize(p.farm); F.tick(p.farm); F.addBoost(p.farm, g.m, g.h, now); wallet.touch({ type: 'gift', kind: g.kind }); return true; }
  if (['all', 'chal', 'sell'].includes(g.kind) && g.m > 1 && g.h > 0) { l.boosts = activeBoosts(p, now); l.boosts.push({ g: g.kind, m: g.m, u: now + g.h * 3600000 }); wallet.touch({ type: 'gift', kind: g.kind }); return true; }
  if (g.kind === 'spin' && g.n > 0) { l.spins = (l.spins || 0) + Math.floor(g.n); wallet.touch({ type: 'gift', kind: g.kind }); return true; }
  return false;
}

// Tickets à gratter gagnés dans les anciennes caisses
export const freeTickets = (p, t) => (p && p.loot && p.loot.tk && p.loot.tk[t]) || 0;
export function useTicket(wallet, t) {
  const l = wallet.p.loot;
  if (!freeTickets(wallet.p, t)) return false;
  l.tk = { ...l.tk, [t]: l.tk[t] - 1 };
  wallet.credit('loot', TICKETS[t][1], { ticket: t }); // le ticket est payé avec ces Brundles (mise normale ensuite)
  return true;
}

// Branché sur le portefeuille, après chaque gain de mini-jeu : boosts des caisses (stats.lootfreeTotal)
// et bonus du cadre équipé (stats.cosmeticTotal), versés à part
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
