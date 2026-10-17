// Ferme à bananes : règles et calculs (aucun affichage ici, testable hors navigateur).
// Production continue (même hors ligne), stock limité par les entrepôts, chantiers avec durée.
// L'état est un petit objet stocké dans le profil du joueur (champ « farm »), lisible par les autres joueurs.

export const SIZE = 7;                       // terrain 7 × 7
export const START = [16, 17, 18, 23, 24, 25, 30, 31, 32]; // carré 3 × 3 du centre, offert
export const HOUR = 3600000;

// Bâtiments. costOf(f, t, L) = prix en Brundles pour atteindre le niveau L (L = 1 : construction) = base × PRICE × grow^(L-1)
export const B = {
  F: { name: 'Bananeraie', short: 'Champ', max: 15, base: 32, grow: 2.03, extra: 1.72, time: 35, tgrow: 1.75,
    desc: 'Les singes ouvriers y récoltent des bananes. Plus le niveau est haut, plus chaque singe récolte, et plus il y a de places.' },
  C: { name: 'Cabane', short: 'Cabane', max: 12, base: 48, grow: 1.88, extra: 1.67, time: 45, tgrow: 1.65,
    desc: 'Loge les singes ouvriers. Chaque niveau ajoute des places.' },
  E: { name: 'Entrepôt', short: 'Entrepôt', max: 12, base: 64, grow: 1.93, extra: 1.77, time: 55, tgrow: 1.65,
    desc: 'Stocke les bananes. Quand tout est plein, la récolte s\'arrête : reviens vendre ou dépenser !' },
  P: { name: 'Puits', short: 'Puits', max: 6, base: 300, grow: 2.55, extra: 1.95, time: 220, tgrow: 2,
    desc: 'Irrigue les 8 cases autour : les bananeraies voisines produisent plus.' },
  M: { name: 'Marché', short: 'Marché', max: 10, base: 180, grow: 2.1, extra: 99, time: 140, tgrow: 1.75, unique: true,
    desc: 'Les bananes s\'y vendent plus cher. Un seul marché par ferme.' },
};
export const TYPES = ['F', 'C', 'E', 'P', 'M'];

// Effets
// bananes / h par singe (la progression ralentit après le niveau 12)
export const perWorker = (L) => 5.75 * Math.pow(1.4, Math.min(L, 12) - 1) * Math.pow(1.2, Math.max(0, L - 12));
export const slots = (L) => Math.min(7, 2 + Math.floor(L / 3));        // singes max par bananeraie
export const housing = (L) => 2 + 2 * L;                               // singes logés par cabane
export const storage = (L) => Math.round(250 * Math.pow(2.05, L - 1)); // capacité d'un entrepôt
export const wellBonus = (L) => 0.1 * L;                               // +10 % par niveau aux champs voisins
// V24 : tout se paie en Brundles ; les bananes servent seulement à être vendues.
export const SELL_BASE = 0.6;                                          // Brundles par banane sans marché
export const MARKET_STEP = 0.04;                                       // + par niveau de marché (niveau 10 : 1 banane = 1 Brundle)
export const sellAt = (marketLevel) => Math.round((SELL_BASE + MARKET_STEP * (marketLevel || 0)) * 1000) / 1000;
export const sellRate = (f) => { const m = findType(f, 'M'); return sellAt(m ? m.l : 0); };
export const PRICE = 0.6;                                              // prix en Brundles = ancien prix en bananes × 0,6 (même rentabilité)
export const hireCost = (n) => Math.round(16 * PRICE * Math.pow(1.16, n));     // prix du (n+1)ᵉ singe, en Brundles
export const landCost = (k) => Math.round(600 * Math.pow(1.2, k));    // k-ième case achetée, en Brundles
export const BUILDERS = [null, 0, 15000, 150000];                       // prix des bâtisseurs 2 et 3, en Brundles
// Finir un chantier tout de suite : 12 Brundles / min restante + la moitié du prix du chantier au prorata du temps restant
export const rushCost = (ms, cost = 0, total = 0) => Math.max(10, Math.ceil(ms / 60000) * 12 + (cost && total ? Math.round(0.5 * cost * Math.min(1, ms / total)) : 0));

// Graines d'or (fin de partie) : replanter la ferme remet les bâtiments à zéro mais rapporte des graines,
// chacune donnant +5 % de production pour toujours. Les parcelles, les bâtisseurs et les graines sont conservés.
export const SEED_BONUS = 0.05;
export const seedGain = (life) => Math.floor(2 * Math.sqrt(Math.max(0, life) / 1e6)); // 1 M récoltées → 2 graines, 25 M → 10
export const REPLANT_MIN = 2;
export const seedMult = (f) => 1 + SEED_BONUS * (f.seeds || 0);
// Récoltes nécessaires (depuis la dernière replantation) pour la graine suivante
export const lifeForSeeds = (n) => Math.pow(n / 2, 2) * 1e6;
// Niveau des bâtiments de départ après une replantation (plus on a de graines, plus on repart grand)
export const restartLevel = (seeds) => Math.min(6, 1 + Math.floor(seeds / 4));

// La grille est un tableau de SIZE × SIZE cases (null ou { t, l }) : un tableau est réécrit en entier à la sauvegarde
// (une « map » Firestore fusionnée garderait les bâtiments démolis).
export const tile = (f, i) => f.g[i] || null;
export const built = (f) => f.g.map((x, i) => (x ? { ...x, i } : null)).filter(Boolean);
export function findType(f, t) { return built(f).find((x) => x.t === t) || null; }
export const countType = (f, t) => built(f).filter((x) => x.t === t).length + f.q.filter((q) => q.t === t && q.l === 1).length;
export const neighbors = (i) => { const r = Math.floor(i / SIZE), c = i % SIZE, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE) out.push(rr * SIZE + cc); }
  return out; };
const sides = (i) => { const r = Math.floor(i / SIZE), c = i % SIZE; return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < SIZE && b < SIZE).map(([a, b]) => a * SIZE + b); };

// Prix d'un niveau (L = 1 : construire). Construire un bâtiment de plus du même type coûte plus cher.
export function costOf(f, t, L) {
  const d = B[t];
  const n = L === 1 ? Math.max(0, countType(f, t) - (t === 'F' || t === 'C' || t === 'E' ? 1 : 0)) : 0;
  return Math.max(1, Math.round(d.base * PRICE * Math.pow(d.grow, L - 1) * Math.pow(d.extra, n)));
}
export const timeOf = (t, L) => Math.round(B[t].time * Math.pow(B[t].tgrow, L - 1)) * 1000;

export function newFarm(now = Date.now()) {
  return { v: 1, t: now, b: 200, own: [...START], w: 2, bu: 1, q: [],
    g: Object.assign(new Array(SIZE * SIZE).fill(null), { 24: { t: 'F', l: 1 }, 17: { t: 'C', l: 1 }, 31: { t: 'E', l: 1 } }),
    tot: 0, sold: 0, earned: 0, rate: 0, life: 0, seeds: 0, rp: 0, bought: 0 };
}

// Remet d'aplomb un état lu depuis le profil (champs manquants, grille au bon format)
export function normalize(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || !raw.v) return newFarm(now);
  const f = { ...newFarm(now), ...raw };
  const g = new Array(SIZE * SIZE).fill(null);
  if (Array.isArray(raw.g)) raw.g.forEach((x, i) => { if (x && B[x.t] && i < g.length) g[i] = { t: x.t, l: Math.max(1, Math.min(B[x.t].max, x.l | 0)) }; });
  else if (raw.g) for (const k in raw.g) { const x = raw.g[k]; if (x && B[x.t] && +k < g.length) g[+k] = { t: x.t, l: x.l | 0 || 1 }; }
  f.g = g;
  f.own = Array.isArray(raw.own) ? raw.own.filter((i) => i >= 0 && i < g.length) : [...START];
  f.q = Array.isArray(raw.q) ? raw.q.filter((q) => q && B[q.t] && q.end) : [];
  for (const k of ['b', 'w', 'bu', 'tot', 'sold', 'earned', 't', 'life', 'seeds', 'rp', 'bought']) f[k] = Number(f[k]) || 0;
  if (!raw.life && raw.tot) f.life = Number(raw.tot) || 0; // fermes créées avant les graines d'or
  f.bu = Math.max(1, Math.min(3, f.bu));
  f.xb = raw.xb && raw.xb.u > now && raw.xb.m > 1 ? { m: Number(raw.xb.m), u: Number(raw.xb.u) } : null;
  return f;
}

/* -------- valeurs dérivées -------- */
export const capacity = (f) => built(f).filter((x) => x.t === 'E').reduce((a, x) => a + storage(x.l), 0);
export const houses = (f) => built(f).filter((x) => x.t === 'C').reduce((a, x) => a + housing(x.l), 0);
// Bonus d'irrigation d'une case
export function irrigation(f, i) { let b = 0; for (const j of neighbors(i)) { const x = f.g[j]; if (x && x.t === 'P') b += wellBonus(x.l); } return b; }
// Répartition des singes : d'abord dans les champs qui rapportent le plus par singe
export function assignment(f) {
  const sm = seedMult(f);
  const fields = built(f).filter((x) => x.t === 'F').map((x) => ({ i: x.i, l: x.l, per: perWorker(x.l) * (1 + irrigation(f, x.i)) * sm, cap: slots(x.l), w: 0 }));
  fields.sort((a, b) => b.per - a.per);
  let left = Math.min(f.w, houses(f));
  for (const x of fields) { x.w = Math.min(x.cap, left); left -= x.w; }
  return { fields, idle: Math.max(0, Math.min(f.w, houses(f)) - fields.reduce((a, x) => a + x.w, 0)), homeless: Math.max(0, f.w - houses(f)) };
}
// Boost de production gagné dans une caisse : f.xb = { m: multiplicateur, u: fin (ms) }
export const boostAt = (f, t = Date.now()) => (f.xb && f.xb.u > t ? f.xb.m : 1);
export function addBoost(f, m, hours, now = Date.now()) {
  // même multiplicateur (ou plus faible) : on prolonge ; plus fort : il remplace, avec la durée restante en plus
  const cur = f.xb && f.xb.u > now ? f.xb : null;
  const start = cur ? cur.u : now;
  f.xb = { m: Math.max(m, cur ? cur.m : 1), u: start + hours * HOUR };
}
export const productionPerHour = (f) => assignment(f).fields.reduce((a, x) => a + x.w * x.per, 0);
export const totalSlots = (f) => built(f).filter((x) => x.t === 'F').reduce((a, x) => a + slots(x.l), 0);

// Une case peut-elle être achetée (touche une case déjà à nous) ?
export const buyable = (f, i) => !f.own.includes(i) && sides(i).some((j) => f.own.includes(j));
export const landPrice = (f) => landCost(f.own.length - START.length);

/* -------- avancer le temps -------- */
// Production jusqu'à `now` en appliquant les chantiers terminés au bon moment. Renvoie les chantiers finis.
export function tick(f, now = Date.now()) {
  const done = [];
  if (!f.t || f.t > now) f.t = now;
  const seg = (until, m) => {
    const dt = (until - f.t) / HOUR;
    if (dt > 0) {
      const cap = capacity(f), p = productionPerHour(f) * m * dt;
      const room = Math.max(0, cap - f.b), got = Math.min(room, p);
      f.b += got; f.tot += got; f.life = (f.life || 0) + got;
    }
    f.t = until;
  };
  // boost de production (caisses) : multiplicateur jusqu'à f.xb.u, puis production normale
  const produce = (until) => {
    if (f.xb && f.xb.u > f.t && f.xb.u < until) { seg(f.xb.u, f.xb.m); seg(until, 1); }
    else seg(until, boostAt(f, f.t));
  };
  f.q.sort((a, b) => a.end - b.end);
  while (f.q.length && f.q[0].end <= now) {
    const q = f.q.shift();
    produce(q.end);
    f.g[q.i] = { t: q.t, l: q.l };
    done.push(q);
  }
  produce(now);
  f.rate = Math.round(productionPerHour(f));
  return done;
}

/* -------- actions (renvoient un message d'erreur, ou null si c'est fait) -------- */
// money = Brundles disponibles (les prix sont en Brundles, débités par l'appelant)
export function canBuild(f, i, t, money = Infinity) {
  if (!f.own.includes(i)) return 'Case pas encore achetée';
  if (tile(f, i) || f.q.some((q) => q.i === i)) return 'Case occupée';
  if (B[t].unique && countType(f, t) >= 1) return `Un seul ${B[t].name.toLowerCase()} par ferme`;
  if (f.q.length >= f.bu) return 'Tous tes bâtisseurs sont occupés';
  if (money < costOf(f, t, 1)) return 'Pas assez de Brundles';
  return null;
}
export function build(f, i, t, now = Date.now(), money = Infinity) {
  const err = canBuild(f, i, t, money);
  if (err) return err;
  f.q.push({ i, t, l: 1, end: now + timeOf(t, 1), start: now, c: costOf(f, t, 1) });
  return null;
}
export function canUpgrade(f, i, money = Infinity) {
  const x = tile(f, i);
  if (!x) return 'Rien à améliorer ici';
  if (x.l >= B[x.t].max) return 'Niveau maximum';
  if (f.q.some((q) => q.i === i)) return 'Déjà en travaux';
  if (f.q.length >= f.bu) return 'Tous tes bâtisseurs sont occupés';
  if (money < costOf(f, x.t, x.l + 1)) return 'Pas assez de Brundles';
  return null;
}
export function upgrade(f, i, now = Date.now(), money = Infinity) {
  const err = canUpgrade(f, i, money);
  if (err) return err;
  const x = tile(f, i);
  f.q.push({ i, t: x.t, l: x.l + 1, end: now + timeOf(x.t, x.l + 1), start: now, c: costOf(f, x.t, x.l + 1) });
  return null;
}
export function hire(f, money = Infinity) {
  if (f.w >= houses(f)) return 'Plus de place dans les cabanes';
  if (money < hireCost(f.w)) return 'Pas assez de Brundles';
  f.w += 1;
  return null;
}
export function demolish(f, i) {
  const x = tile(f, i);
  if (!x) return 'Rien à démolir';
  if (f.q.some((q) => q.i === i)) return 'Chantier en cours';
  if (x.t === 'C' && houses(f) - housing(x.l) < f.w) return 'Tes singes n\'auraient plus de toit';
  if ((x.t === 'F' || x.t === 'C' || x.t === 'E') && built(f).filter((y) => y.t === x.t).length <= 1) return 'Il faut garder au moins un bâtiment de ce type';
  f.g[i] = null;
  f.b = Math.min(f.b, capacity(f));
  return null;
}

// Replanter : graines d'or gagnées, bâtiments et singes remis à zéro (parcelles, bâtisseurs et graines conservés)
export function canReplant(f) {
  if (seedGain(f.life) < REPLANT_MIN) return `Il faut avoir récolté ${Math.round(lifeForSeeds(REPLANT_MIN) / 1e6)} million de bananes depuis la dernière replantation`;
  return null;
}
export function replant(f, now = Date.now()) {
  const err = canReplant(f);
  if (err) return err;
  const gain = seedGain(f.life);
  f.seeds = (f.seeds || 0) + gain;
  f.rp = (f.rp || 0) + 1;
  const L = restartLevel(f.seeds);
  f.g = new Array(SIZE * SIZE).fill(null);
  f.g[24] = { t: 'F', l: L }; f.g[17] = { t: 'C', l: L }; f.g[31] = { t: 'E', l: L };
  f.q = []; f.w = 2; f.life = 0; f.t = now;
  f.b = Math.floor(capacity(f) * 0.8);
  f.lastGain = gain;
  return null;
}

// Score affiché dans le classement des fermes
export const farmScore = (f) => Math.round(f.rate || productionPerHour(f));
export const levels = (f) => built(f).reduce((a, x) => a + x.l, 0);
