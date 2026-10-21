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
export const seedMult = (f) => (1 + SEED_BONUS * (f.seeds || 0)) * prestigeMult(f);
// Prestige (V28) : après 2 M de bananes vendues, on peut remettre la ferme à zéro contre +100 % de production pour toujours.
// Le palier double à chaque fois (2 M, 4 M, 8 M… de bananes vendues depuis le prestige précédent).
export const PRESTIGE_BASE = 2e6, PRESTIGE_BONUS = 1;
export const prestigeMult = (f) => 1 + PRESTIGE_BONUS * ((f && f.pr) || 0);
export const prestigeNeed = (f) => PRESTIGE_BASE * 2 ** ((f && f.pr) || 0);
// V34 : chaque prestige rend les bâtiments 30 % plus chers (constructions et améliorations), ×1,3 puis ×1,69, ×2,2…
export const PRESTIGE_PRICE = 1.3;
export const priceMult = (f) => Math.pow(PRESTIGE_PRICE, (f && f.pr) || 0);
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

// Prix d'un niveau (L = 1 : construire). Construire un bâtiment de plus du même type coûte plus cher,
// et tout coûte 30 % de plus à chaque prestige.
export function costOf(f, t, L) {
  const d = B[t];
  const n = L === 1 ? Math.max(0, countType(f, t) - (t === 'F' || t === 'C' || t === 'E' ? 1 : 0)) : 0;
  return Math.max(1, Math.round(d.base * PRICE * Math.pow(d.grow, L - 1) * Math.pow(d.extra, n) * priceMult(f)));
}
export const timeOf = (t, L) => Math.round(B[t].time * Math.pow(B[t].tgrow, L - 1)) * 1000;
// Vitesse de construction permanente (gagnée dans les caisses) : f.spd = part du temps en moins (0,1 = −10 %), plafonnée
export const SPEED_MAX = 0.6;
export const speedOf = (f) => Math.max(0, Math.min(SPEED_MAX, (f && f.spd) || 0));
export const buildTime = (f, t, L) => Math.max(1000, Math.round(timeOf(t, L) * (1 - speedOf(f))));
// Brundles investis dans un bâtiment (construction + toutes ses améliorations).
// V34 : chaque case garde ce qui a vraiment été payé (x.c) ; sans ce champ (bâtiment d'avant la V34), estimation à
// l'ancien prix, sans la hausse due au prestige (sinon démolir rapporterait plus que ce qui a été payé).
export function investedIn(f, i) {
  const x = tile(f, i);
  if (!x) return 0;
  if (typeof x.c === 'number') return Math.round(x.c);
  return legacyInvested(f, x);
}
function legacyInvested(f, x) {
  const d = B[x.t];
  const n = Math.max(0, countType(f, x.t) - 1 - (x.t === 'F' || x.t === 'C' || x.t === 'E' ? 1 : 0));
  let sum = d.base * PRICE * Math.pow(d.extra, n);
  for (let L = 2; L <= x.l; L++) sum += d.base * PRICE * Math.pow(d.grow, L - 1);
  return Math.round(sum);
}
export const REFUND = 0.6; // part remboursée à la démolition
export const refundOf = (f, i) => Math.floor(investedIn(f, i) * REFUND);

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
  if (Array.isArray(raw.g)) raw.g.forEach((x, i) => { if (x && B[x.t] && i < g.length) g[i] = { t: x.t, l: Math.max(1, Math.min(B[x.t].max, x.l | 0)), ...(Number.isFinite(x.c) && x.c >= 0 ? { c: Math.round(x.c) } : {}) }; });
  else if (raw.g) for (const k in raw.g) { const x = raw.g[k]; if (x && B[x.t] && +k < g.length) g[+k] = { t: x.t, l: x.l | 0 || 1 }; }
  f.g = g;
  f.own = Array.isArray(raw.own) ? raw.own.filter((i) => i >= 0 && i < g.length) : [...START];
  f.q = Array.isArray(raw.q) ? raw.q.filter((q) => q && B[q.t] && q.end) : [];
  for (const k of ['b', 'w', 'bu', 'tot', 'sold', 'earned', 't', 'life', 'seeds', 'rp', 'bought']) f[k] = Number(f[k]) || 0;
  if (!raw.life && raw.tot) f.life = Number(raw.tot) || 0; // fermes créées avant les graines d'or
  f.bu = Math.max(1, Math.min(3, f.bu));
  migrate(f, now);
  f.spd = Math.max(0, Math.min(SPEED_MAX, Number(raw.spd) || 0));
  return f;
}

/* -------- valeurs dérivées -------- */
// Capacité d'un entrepôt dans cette ferme : multipliée comme la production à chaque prestige (×2, ×3…),
// pour que les entrepôts ne se remplissent pas plus vite après un prestige
export const storageOf = (f, L) => Math.round(storage(L) * prestigeMult(f));
export const capacity = (f) => built(f).filter((x) => x.t === 'E').reduce((a, x) => a + storageOf(f, x.l), 0);
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
// Boosts de récolte gagnés dans les caisses : f.xbs = [{ m, u }]. Ils se cumulent avec un rendement dégressif (V30) :
// le plus fort compte en entier, le 2e à 1/2, le 3e à 1/3, le 4e à 1/4… : chaque nouveau boost ajoute toujours un peu,
// sans jamais s'arrêter net, jusqu'au plafond de ×5 (dix ×1,5 → ×2,46 ; dix ×2 → ×3,93 ; trois ×3 → ×4,67).
export const FARM_BOOST_CAP = 5;
// Fermes d'avant la V28 (V29 : correctif) : l'ancien boost unique f.xb rejoint la liste f.xbs (sans doublon), puis
// f.xb passe à null (la sauvegarde Firestore fusionne les champs : sans ce null, l'ancien boost reviendrait à chaque chargement).
// Les ventes passées comptent pour le premier prestige.
export function migrate(f, now = Date.now()) {
  if (!f || typeof f !== 'object') return f;
  let list = Array.isArray(f.xbs) ? f.xbs : [];
  if (f.xb && Number(f.xb.m) > 1 && !list.some((b) => b && Number(b.u) === Number(f.xb.u) && Number(b.m) === Number(f.xb.m))) list = [...list, f.xb];
  if (f.xb !== null) f.xb = null;
  f.xbs = list.filter((b) => b && Number(b.u) > now && Number(b.m) > 1).map((b) => ({ m: Number(b.m), u: Number(b.u) })).slice(0, 40);
  if (!(f.pr >= 0)) f.pr = Math.max(0, Number(f.pr) || 0);
  if (f.ss === undefined || f.ss === null || Number.isNaN(Number(f.ss))) f.ss = Number(f.sold) || 0;
  // V29 : en V28, les fermes jamais « normalisées » repartaient de 0 vente pour le premier prestige : on rattrape une fois
  if (f.ssm !== 1) { if (!f.pr) f.ss = Math.max(Number(f.ss) || 0, Number(f.sold) || 0); f.ssm = 1; }
  return f;
}
export function farmStack(ms) {
  const s = ms.filter((m) => m > 1).sort((a, b) => b - a);
  let t = 1;
  s.forEach((m, i) => { t += (m - 1) / (i + 1); });
  return Math.min(FARM_BOOST_CAP, Math.round(t * 100) / 100);
}
export const activeFarmBoosts = (f, t = Date.now()) => { if (f && (f.xb || !Array.isArray(f.xbs))) migrate(f, Math.min(t, f.t || t)); return ((f && f.xbs) || []).filter((b) => b.u > t); };
export const boostAt = (f, t = Date.now()) => farmStack(activeFarmBoosts(f, t).map((b) => b.m));
export const boostEnd = (f, t = Date.now()) => Math.max(0, ...activeFarmBoosts(f, t).map((b) => b.u));
export function addBoost(f, m, hours, now = Date.now()) {
  f.xbs = [...activeFarmBoosts(f, now), { m, u: now + hours * HOUR }];
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
  migrate(f, Math.min(now, f.t || now));
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
  // boosts de récolte (caisses) : on découpe la période à chaque fin de boost
  const produce = (until) => {
    const ends = activeFarmBoosts(f, f.t).map((b) => b.u).filter((u) => u < until).sort((a, b) => a - b);
    for (const u of ends) seg(u, boostAt(f, f.t));
    seg(until, boostAt(f, f.t));
  };
  f.q.sort((a, b) => a.end - b.end);
  while (f.q.length && f.q[0].end <= now) {
    const q = f.q.shift();
    produce(q.end);
    const prev = f.g[q.i];
    // ce qui a été payé pour ce bâtiment (remboursement à la démolition)
    const paid = (prev ? (typeof prev.c === 'number' ? prev.c : legacyInvested(f, prev)) : 0) + (q.c || 0);
    f.g[q.i] = { t: q.t, l: q.l, c: Math.round(paid) };
    done.push(q);
  }
  produce(now);
  f.rate = Math.round(productionPerHour(f));
  if (f.xbs && f.xbs.some((b) => b.u <= now)) f.xbs = activeFarmBoosts(f, now);
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
  f.q.push({ i, t, l: 1, end: now + buildTime(f, t, 1), start: now, c: costOf(f, t, 1) });
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
  f.q.push({ i, t: x.t, l: x.l + 1, end: now + buildTime(f, x.t, x.l + 1), start: now, c: costOf(f, x.t, x.l + 1) });
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

// Prestige : bâtiments, singes et bananes remis à zéro contre +100 % de production pour toujours.
// Conservés : parcelles, bâtisseurs, graines d'or, vitesse de construction et statistiques.
export function canPrestige(f) {
  const need = prestigeNeed(f);
  if ((f.ss || 0) < need) return `Il faut avoir vendu ${fmtM(need)} de bananes depuis ${f.pr ? 'le dernier prestige' : 'le début'}`;
  if (f.q.length) return 'Attends la fin de tes chantiers';
  return null;
}
const fmtM = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} million${n >= 2e6 ? 's' : ''}` : Math.round(n).toLocaleString('fr-FR'));
export function prestige(f, now = Date.now()) {
  const err = canPrestige(f);
  if (err) return err;
  tick(f, now);
  f.pr = (f.pr || 0) + 1;
  f.rp = (f.rp || 0) + 1;
  f.ss = 0;
  const L = Math.min(6, f.pr + 1); // on repart un peu plus grand à chaque prestige
  f.g = new Array(SIZE * SIZE).fill(null);
  f.g[24] = { t: 'F', l: L, c: 0 }; f.g[17] = { t: 'C', l: L, c: 0 }; f.g[31] = { t: 'E', l: L, c: 0 }; // offerts
  f.q = []; f.w = 2; f.life = 0; f.t = now;
  f.b = Math.floor(capacity(f) * 0.8);
  return null;
}

// Prestige + reconstruction (V34) : après le prestige, la ferme est remise exactement comme avant (mêmes bâtiments,
// mêmes cases, mêmes niveaux, même nombre de singes), au prix d'après le prestige (+30 %), chantiers terminés tout de
// suite : chaque niveau compte aussi le prix pour finir le chantier (rushCost sur toute sa durée).
// Renvoie { err } ou { build, rush, hire, total, g, w, levels }.
export function replayQuote(f0, now = Date.now()) {
  const err = canPrestige(f0);
  if (err) return { err };
  const layout = built(f0).map((x) => ({ i: x.i, t: x.t, l: x.l })).sort((a, b) => a.i - b.i);
  const f = JSON.parse(JSON.stringify(f0));
  f.g = f0.g.map((x) => (x ? { ...x } : null)); f.q = []; f.xbs = (f0.xbs || []).map((b) => ({ ...b }));
  const e2 = prestige(f, now);
  if (e2) return { err: e2 };
  // bâtiments offerts : gardés s'ils correspondent au plan, sinon la case est libérée pour le plan
  for (const i of [24, 17, 31]) { const x = f.g[i], want = layout.find((y) => y.i === i); if (x && want && want.t !== x.t) f.g[i] = null; }
  let build = 0, rush = 0, hire = 0, levels = 0;
  // constructions d'abord (le prix d'un bâtiment de plus dépend du nombre déjà construit), puis améliorations
  for (const { i, t } of layout) {
    if (f.g[i] && f.g[i].t === t) continue;
    const c = costOf(f, t, 1), ms = buildTime(f, t, 1);
    build += c; rush += rushCost(ms, c, ms); levels++;
    f.g[i] = { t, l: 1, c };
  }
  for (const { i, t, l } of layout) {
    for (let L = f.g[i].l + 1; L <= l; L++) {
      const c = costOf(f, t, L), ms = buildTime(f, t, L);
      build += c; rush += rushCost(ms, c, ms); levels++;
      f.g[i] = { t, l: L, c: (f.g[i].c || 0) + c };
    }
  }
  const w = Math.min(f0.w, houses(f));
  for (let n = f.w; n < w; n++) hire += hireCost(n);
  return { build, rush, hire, total: build + rush + hire, g: f.g, w, levels };
}
// Applique le prestige puis la reconstruction chiffrée par replayQuote (le prix est débité par l'appelant)
export function prestigeReplay(f, quote, now = Date.now()) {
  const err = prestige(f, now);
  if (err) return err;
  f.g = quote.g.map((x) => (x ? { ...x } : null));
  f.w = quote.w;
  f.rate = Math.round(productionPerHour(f));
  return null;
}

// Score affiché dans le classement des fermes
export const farmScore = (f) => Math.round(f.rate || productionPerHour(f));
export const levels = (f) => built(f).reduce((a, x) => a + x.l, 0);
