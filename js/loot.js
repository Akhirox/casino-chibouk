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
export const PERM_MAX = Infinity; // bonus permanent des gains gratuits : sans plafond
// plafonds des autres bonus permanents : intérêts du coffre (+100 % → 10 %/jour au lieu de 5 %), vente des bananes (+100 %)
export const PERM_CAP = { vault: 1, sell: 1 };
export const TICKETS = { banane: ['Banane Express', 10], singe: ['Singe d\'Or', 100], tresor: ['Trésor de la Jungle', 1000] };

// Caisses. theme : std (classiques), cos (cosmétiques), risk (va-tout), farm (fermier)
// k = multiplicateur des gains en Brundles ; perm = bonus permanent du lot mythique (classiques) ;
// tk = tickets à gratter des lots communs et rares (caisses pas chères) : [ticket, nombre commun, nombre rare]
export const CASES = [
  // grp : A = petites caisses (Brundles, tickets, boosts temporaires courts), B = moyennes (boosts longs + premiers
  // bonus permanents), C = grandes (presque que des bonus permanents, plus aucun boost temporaire).
  // ev (A et B) = part du prix rendue en moyenne en Brundles (tickets compris)
  // f (C) = taille des bonus permanents [gains gratuits, coffre et vente des bananes, graines d'or] par rapport à la Jungle
  { id: 'cacahuete', grp: 'A', theme: 'std', name: 'Caisse Cacahuète', price: 500, ev: 0.55, tk: ['singe', 2, 6], hue: '#c9a26b', desc: 'Petits lots, boosts d\'une heure, gros lots très rares.' },
  { id: 'coco', grp: 'A', theme: 'std', name: 'Caisse Noix de coco', price: 1000, ev: 0.58, tk: ['singe', 4, 12], hue: '#b07a4a', desc: 'Brundles, tickets Singe d\'Or, boosts courts.' },
  { id: 'mangue', grp: 'A', theme: 'std', name: 'Caisse Mangue', price: 2500, ev: 0.62, tk: ['tresor', 1, 4], hue: '#ffa53d', desc: 'Premiers tickets Trésor, tours de roue bonus.' },
  { id: 'banane', grp: 'A', theme: 'std', name: 'Caisse Banane', price: 5000, ev: 0.65, tk: ['tresor', 2, 8], hue: '#f5c542', desc: 'Boosts de mini-jeux et de défis.' },
  { id: 'ananas', grp: 'A', theme: 'std', name: 'Caisse Ananas', price: 10000, ev: 0.68, tk: ['tresor', 5, 15], hue: '#e6d14a', desc: 'Les boosts temporaires les plus longs des petites caisses.' },
  { id: 'papaye', grp: 'B', theme: 'std', name: 'Caisse Papaye', price: 20000, ev: 0.62, tk: ['tresor', 10, 30], hue: '#ff7a59', desc: 'Boosts d\'une journée et premiers bonus permanents.' },
  { id: 'liane', grp: 'B', theme: 'std', name: 'Caisse Liane', price: 30000, ev: 0.62, tk: ['tresor', 15, 45], hue: '#5fc46a', desc: 'Boosts de plusieurs jours, bonus permanents plus fréquents.' },
  { id: 'jungle', grp: 'C', theme: 'std', name: 'Caisse Jungle', price: 50000, f: [1, 1, 1], k: 1, hue: '#3ddc84', desc: 'Bonus permanents : gains gratuits, intérêts du coffre, ferme.' },
  { id: 'singe', grp: 'C', theme: 'std', name: 'Caisse Singe d\'Or', price: 500000, f: [3, 4, 3], k: 1, hue: '#ff8a3d', desc: 'Bonus permanents 3 à 4 fois plus gros que la Jungle.' },
  { id: 'roi', grp: 'C', theme: 'std', name: 'Caisse du Roi', price: 5000000, f: [8, 12, 8], k: 1, hue: '#c77dff', desc: 'Les plus gros bonus permanents : jusqu\'à +40 % de gains gratuits, +100 % d\'intérêts.' },
  { id: 'cosmo', theme: 'cos', name: 'Caisse Cosmétique', price: 50000, k: 1, hue: '#ff6fb5', desc: 'Que des cosmétiques exclusifs (avec leurs bonus). Doublons remboursés.' },
  { id: 'vatout', theme: 'risk', name: 'Caisse Va-tout', price: 250000, k: 0.85, hue: '#ff4d5e', desc: 'Souvent presque rien… mais jusqu\'à ×127 le prix.' },
  { id: 'fermier', theme: 'farm', name: 'Caisse du Fermier', price: 100000, k: 1, hue: '#9bd34a', desc: 'Graines d\'or, vitesse de construction, boosts de récolte.' },
];
export const caseById = (id) => CASES.find((c) => c.id === id);

// Échelle de prix des caisses classiques : 0 à 500 Brundles, 1 à partir de 50 000 (échelle logarithmique).
// Plus la caisse est bon marché, plus les lots Épique / Légendaire / Mythique sont rares et plus les boosts sont modestes.
export const scaleOf = (c) => (c.theme === 'std' ? Math.max(0, Math.min(1, (Math.log10(c.price) - Math.log10(500)) / 2)) : 1);
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
// Poids des raretés (sur 100 000) d'une caisse
export function oddsOf(c) {
  const t = scaleOf(c);
  const o = { purple: lerp(12000, RARITIES.purple.w, t), pink: lerp(1200, RARITIES.pink.w, t), red: lerp(120, RARITIES.red.w, t), gold: lerp(30, RARITIES.gold.w, t) };
  o.blue = R_TOTAL - o.purple - o.pink - o.red - o.gold;
  return o;
}
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
  const tk = c.tk, t = scaleOf(c), [fP, fV, fN] = c.f || [1, 1, 1];
  if (c.grp === 'A') {
    // petites caisses : de quoi profiter tout de suite (Brundles, tickets, boosts de quelques heures, tours de roue)
    const ta = Math.max(0, Math.min(1, (Math.log10(c.price) - Math.log10(500)) / Math.log10(20))); // 0 à 500, 1 à 10 000
    return [
      { r: 'blue', w: 3, kind: 'br', x: 0.3 }, { r: 'blue', w: 3, kind: 'br', x: 0.5 }, { r: 'blue', w: 2, kind: 'br', x: 0.7 },
      { r: 'blue', w: 2, kind: 'scratch', t: tk[0], n: tk[1] },
      { r: 'blue', w: 2, kind: 'boost', game: 'all', m: 1.5, h: 1 }, { r: 'blue', w: 1, kind: 'farm', m: 1.5, h: 1 }, { r: 'blue', w: 1, kind: 'boost', game: 'chal', m: 1.5, h: 1 },
      { r: 'purple', w: 3, kind: 'br', x: 1.2 }, { r: 'purple', w: 2, kind: 'scratch', t: tk[0], n: tk[2] },
      { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 1.5, h: Math.round(1 + 2 * ta) }, { r: 'purple', w: 1, kind: 'farm', m: 1.5, h: Math.round(1 + 3 * ta) },
      { r: 'pink', w: 2, kind: 'br', x: 4 }, { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 2, h: Math.round(2 + 4 * ta) },
      { r: 'pink', w: 1, kind: 'boost', game: 'chal', m: 2, h: Math.round(2 + 10 * ta) }, { r: 'pink', w: 1, kind: 'spin', n: 1 },
      { r: 'red', w: 2, kind: 'br', x: 12 }, { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: Math.round(6 + 18 * ta) }, { r: 'red', w: 1, kind: 'spin', n: 3 },
      { r: 'gold', w: 1, kind: 'br', x: 50 }, { r: 'gold', w: 1, kind: 'perm', v: Math.round((0.001 + 0.004 * ta) * 1000) / 1000 },
    ];
  }
  if (c.grp === 'B') {
    // moyennes : boosts longs (1 à 3 jours) et premiers bonus permanents
    return [
      { r: 'blue', w: 3, kind: 'br', x: 0.3 }, { r: 'blue', w: 3, kind: 'br', x: 0.5 }, { r: 'blue', w: 2, kind: 'br', x: 0.7 },
      { r: 'blue', w: 2, kind: 'scratch', t: tk[0], n: tk[1] },
      { r: 'blue', w: 2, kind: 'boost', game: 'all', m: 1.5, h: 4 }, { r: 'blue', w: 1, kind: 'farm', m: 1.5, h: 6 },
      { r: 'purple', w: 2, kind: 'br', x: 1.5 }, { r: 'purple', w: 2, kind: 'boost', game: 'all', m: 2, h: 12 }, { r: 'purple', w: 1, kind: 'farm', m: 2, h: 12 },
      { r: 'purple', w: 1, kind: 'boost', game: 'chal', m: 2, h: 24 }, { r: 'purple', w: 1, kind: 'scratch', t: tk[0], n: tk[2] },
      { r: 'pink', w: 1, kind: 'boost', game: 'all', m: 3, h: 24 }, { r: 'pink', w: 1, kind: 'farm', m: 2, h: 48 }, { r: 'pink', w: 1, kind: 'spin', n: 3 },
      { r: 'pink', w: 1, kind: 'perm', v: 0.002 }, { r: 'pink', w: 1, kind: 'vault', v: 0.01 },
      { r: 'red', w: 1, kind: 'boost', game: 'all', m: 3, h: 72 }, { r: 'red', w: 1, kind: 'perm', v: 0.005 }, { r: 'red', w: 1, kind: 'vault', v: 0.02 }, { r: 'red', w: 1, kind: 'seed', n: 1 },
      { r: 'gold', w: 1, kind: 'br', x: 50 }, { r: 'gold', w: 1, kind: 'perm', v: 0.015 }, { r: 'gold', w: 1, kind: 'vault', v: 0.05 },
    ];
  }
  // grandes caisses : bonus permanents (aucun boost temporaire). Les communs restent surtout des Brundles.
  const P = (x) => Math.round(x * fP * 10000) / 10000, V = (x) => Math.round(x * fV * 10000) / 10000;
  return [
    { r: 'blue', w: 3, kind: 'br', x: 0.4 }, { r: 'blue', w: 3, kind: 'br', x: 0.6 },
    { r: 'blue', w: 1, kind: 'perm', v: P(0.001) }, { r: 'blue', w: 1, kind: 'vault', v: V(0.005) }, { r: 'blue', w: 1, kind: 'sell', v: V(0.01) },
    { r: 'purple', w: 2, kind: 'perm', v: P(0.003) }, { r: 'purple', w: 2, kind: 'vault', v: V(0.01) }, { r: 'purple', w: 1, kind: 'sell', v: V(0.03) },
    { r: 'purple', w: 1, kind: 'seed', n: fN }, { r: 'purple', w: 1, kind: 'br', x: 1.5 },
    { r: 'pink', w: 2, kind: 'perm', v: P(0.008) }, { r: 'pink', w: 1, kind: 'vault', v: V(0.03) }, { r: 'pink', w: 1, kind: 'seed', n: 2 * fN }, { r: 'pink', w: 1, kind: 'speed', s: Math.min(0.2, 0.02 * fN) },
    { r: 'red', w: 2, kind: 'perm', v: P(0.02) }, { r: 'red', w: 1, kind: 'vault', v: V(0.06) }, { r: 'red', w: 1, kind: 'seed', n: 4 * fN },
    { r: 'gold', w: 1, kind: 'perm', v: P(0.05) }, { r: 'gold', w: 1, kind: 'vault', v: Math.min(1, V(0.15)) }, { r: 'gold', w: 1, kind: 'br', x: 60 },
  ];
}
const DUP_X = { blue: 0.5, purple: 1.5, pink: 5, red: 15, gold: 60 }; // cosmétique déjà possédé → Brundles
const COS_TIER = { common: 'blue', rare: 'purple', epic: 'pink', legend: 'red', mythic: 'gold' };
export const brAmount = (c, x) => Math.round(c.price * c.k * x);
// Caisses classiques : k calculé pour que la caisse rende « ev » du prix en moyenne (Brundles + tickets à 98 %)
for (const c of CASES) {
  if (c.theme !== 'std' || !c.ev) continue;
  const pool = poolOf(c), odds = oddsOf(c), ws = (r) => pool.filter((it) => it.r === r).reduce((a, it) => a + it.w, 0);
  let br = 0, tick = 0;
  for (const it of pool) {
    const ch = (odds[it.r] / R_TOTAL) * (it.w / ws(it.r));
    if (it.kind === 'br') br += ch * it.x * c.price;
    else if (it.kind === 'scratch') tick += ch * TICKETS[it.t][1] * it.n * 0.98;
  }
  c.k = Math.round(((c.ev * c.price - tick) / br) * 1000) / 1000;
}
const tierItems = (c, r) => poolOf(c).filter((it) => it.r === r);
const wsum = (list) => list.reduce((a, it) => a + it.w, 0);
// Probabilité d'un lot du contenu
export const chanceOf = (c, it) => (oddsOf(c)[it.r] / R_TOTAL) * (it.w / wsum(tierItems(c, it.r)));
// Valeur moyenne en Brundles (tickets à gratter comptés à leur valeur de jeu, 98 %), hors boosts, cosmétiques, graines…
export const valueOf = (c) => poolOf(c).reduce((a, it) => a + chanceOf(c, it) * (it.kind === 'br' ? brAmount(c, it.x) : it.kind === 'scratch' ? TICKETS[it.t][1] * it.n * 0.98 : 0), 0);

function pickWeighted(list, rnd = randInt) {
  let n = rnd(wsum(list));
  for (const it of list) { if (n < it.w) return it; n -= it.w; }
  return list[list.length - 1];
}
function rollRarity(c, rnd = randInt) {
  const o = oddsOf(c);
  let n = rnd(R_TOTAL);
  for (const r of R_ORDER) { if (n < o[r]) return r; n -= o[r]; }
  return 'blue';
}

// Tirage d'un lot concret. p = profil (pour les doublons de cosmétiques et le plafond du bonus permanent) ;
// sans p (remplissage de la bande animée), on tire simplement un lot plausible.
export function draw(c, p = null, rnd = randInt) {
  const r = rollRarity(c, rnd);
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
  } else if (it.kind === 'perm') d.perm = it.v || c.perm;
  else if (it.kind === 'vault' || it.kind === 'sell') {
    d.v = it.v;
    const cur = (p && p.loot && p.loot[it.kind]) || 0;
    if (p && cur >= PERM_CAP[it.kind] - 1e-9) { d.kind = 'br'; d.amount = brAmount(c, { blue: 0.6, purple: 1.5, pink: 5, red: 15, gold: 60 }[it.r]); d.capped = it.kind; }
  } else if (it.kind === 'spin') d.n = it.n;
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
  const pc = (x) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';
  const dh = (h) => (h >= 48 && h % 24 === 0 ? `${h / 24} jours` : `${h} h`);
  switch (d.kind) {
    case 'br': return { title: Math.round(d.amount).toLocaleString('fr-FR'), sub: d.capped ? `Brundles (${{ speed: 'vitesse de construction', vault: 'bonus du coffre', sell: 'bonus de vente' }[d.capped]} au maximum)` : 'Brundles', icon: 'coin' };
    case 'vault': return { title: `Coffre +${pc(d.v)}`, sub: 'd\'intérêts, pour toujours', icon: 'vault' };
    case 'sell': return { title: `Bananes +${pc(d.v)}`, sub: 'prix de vente, pour toujours', icon: 'banana' };
    case 'spin': return { title: d.n > 1 ? `${d.n} tours de roue` : 'Tour de roue', sub: 'roue du jour en plus', icon: 'wheel' };
    case 'scratch': return { title: `${d.n} ticket${d.n > 1 ? 's' : ''} à gratter`, sub: `${TICKETS[d.t][0]} (${TICKETS[d.t][1].toLocaleString('fr-FR')} ${d.n > 1 ? 'chacun' : ''})`, icon: 'scratch' };
    case 'boost': return d.game === 'all'
      ? { title: `${fx(d.m)} mini-jeux`, sub: `tous les mini-jeux · ${dh(d.h)}`, icon: 'gift' }
      : d.game === 'chal' ? { title: `${fx(d.m)} défis`, sub: `récompenses des défis · ${dh(d.h)}`, icon: 'flag' }
      : { title: `${fx(d.m)} ${BOOST_GAMES[d.game] ? BOOST_GAMES[d.game][0] : d.game}`, sub: `gains du jeu · ${d.h} h`, icon: BOOST_GAMES[d.game] ? BOOST_GAMES[d.game][1] : 'gift' };
    case 'farm': return { title: `Ferme ${fx(d.m)}`, sub: `production · ${dh(d.h)}`, icon: 'banana' };
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
// Boost temporaire des récompenses des défis (lot « ×2 défis »)
export function chalBoost(p, now = Date.now()) { return Math.max(1, ...activeBoosts(p, now).filter((b) => b.g === 'chal').map((b) => b.m)); }
export const lootPerm = (p, k) => Math.max(0, Math.min(PERM_CAP[k] ?? Infinity, (p && p.loot && p.loot[k]) || 0));
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
  } else if (d.kind === 'perm') l.perm = Math.round(((l.perm || 0) + d.perm) * 10000) / 10000;
  else if (d.kind === 'vault' || d.kind === 'sell') {
    if (d.kind === 'vault' && wallet.accrueVault) wallet.accrueVault(); // les intérêts déjà courus restent au taux d'avant
    l[d.kind] = Math.min(PERM_CAP[d.kind], Math.round(((l[d.kind] || 0) + d.v) * 10000) / 10000);
  } else if (d.kind === 'spin') l.spins = (l.spins || 0) + d.n;
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
