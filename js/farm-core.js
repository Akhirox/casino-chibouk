// Ferme à bananes : règles et calculs (aucun affichage ici, testable hors navigateur).
// Production continue (même hors ligne), stock limité par les entrepôts, chantiers avec durée.
// L'état est un petit objet stocké dans le profil du joueur (champ « farm »), lisible par les autres joueurs.

export const SIZE = 7;                       // terrain 7 × 7
export const START = [16, 17, 18, 23, 24, 25, 30, 31, 32]; // carré 3 × 3 du centre, offert
export const HOUR = 3600000;

// Bâtiments. cost(L) = prix en bananes pour atteindre le niveau L (L = 1 : construction)
export const B = {
  F: { name: 'Bananeraie', short: 'Champ', max: 12, base: 40, grow: 2.05, extra: 1.75, time: 45, tgrow: 1.8,
    desc: 'Les singes ouvriers y récoltent des bananes. Plus le niveau est haut, plus chaque singe récolte, et plus il y a de places.' },
  C: { name: 'Cabane', short: 'Cabane', max: 10, base: 60, grow: 1.9, extra: 1.7, time: 60, tgrow: 1.7,
    desc: 'Loge les singes ouvriers. Chaque niveau ajoute des places.' },
  E: { name: 'Entrepôt', short: 'Entrepôt', max: 10, base: 80, grow: 1.95, extra: 1.8, time: 75, tgrow: 1.7,
    desc: 'Stocke les bananes. Quand tout est plein, la récolte s\'arrête : reviens vendre ou dépenser !' },
  P: { name: 'Puits', short: 'Puits', max: 5, base: 400, grow: 2.6, extra: 2, time: 300, tgrow: 2.1,
    desc: 'Irrigue les 8 cases autour : les bananeraies voisines produisent plus.' },
  M: { name: 'Marché', short: 'Marché', max: 10, base: 250, grow: 2.15, extra: 99, time: 180, tgrow: 1.8, unique: true,
    desc: 'Les bananes s\'y vendent plus cher. Un seul marché par ferme.' },
};
export const TYPES = ['F', 'C', 'E', 'P', 'M'];

// Effets
export const perWorker = (L) => 5 * Math.pow(1.4, L - 1);          // bananes / h par singe
export const slots = (L) => Math.min(6, 2 + Math.floor(L / 3));        // singes max par bananeraie
export const housing = (L) => 2 + 2 * L;                               // singes logés par cabane
export const storage = (L) => Math.round(250 * Math.pow(2.05, L - 1)); // capacité d'un entrepôt
export const wellBonus = (L) => 0.1 * L;                               // +10 % par niveau aux champs voisins
export const SELL_BASE = 0.1;                                          // Brundles par banane sans marché
export const sellRate = (f) => { const m = findType(f, 'M'); return SELL_BASE * (1 + (m ? 0.1 * m.l : 0)); };
export const hireCost = (n) => Math.round(20 * Math.pow(1.17, n));     // prix du (n+1)ᵉ singe, en bananes
export const landCost = (k) => Math.round(800 * Math.pow(1.22, k));   // k-ième case achetée, en Brundles
export const BUILDERS = [null, 0, 25000, 250000];                       // prix des bâtisseurs 2 et 3, en Brundles
export const rushCost = (ms) => Math.max(10, Math.ceil(ms / 60000) * 12); // finir tout de suite : 12 Brundles / min

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
  return Math.round(d.base * Math.pow(d.grow, L - 1) * Math.pow(d.extra, n));
}
export const timeOf = (t, L) => Math.round(B[t].time * Math.pow(B[t].tgrow, L - 1)) * 1000;

export function newFarm(now = Date.now()) {
  return { v: 1, t: now, b: 200, own: [...START], w: 2, bu: 1, q: [],
    g: Object.assign(new Array(SIZE * SIZE).fill(null), { 24: { t: 'F', l: 1 }, 17: { t: 'C', l: 1 }, 31: { t: 'E', l: 1 } }),
    tot: 0, sold: 0, earned: 0, rate: 0 };
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
  for (const k of ['b', 'w', 'bu', 'tot', 'sold', 'earned', 't']) f[k] = Number(f[k]) || 0;
  f.bu = Math.max(1, Math.min(3, f.bu));
  return f;
}

/* -------- valeurs dérivées -------- */
export const capacity = (f) => built(f).filter((x) => x.t === 'E').reduce((a, x) => a + storage(x.l), 0);
export const houses = (f) => built(f).filter((x) => x.t === 'C').reduce((a, x) => a + housing(x.l), 0);
// Bonus d'irrigation d'une case
export function irrigation(f, i) { let b = 0; for (const j of neighbors(i)) { const x = f.g[j]; if (x && x.t === 'P') b += wellBonus(x.l); } return b; }
// Répartition des singes : d'abord dans les champs qui rapportent le plus par singe
export function assignment(f) {
  const fields = built(f).filter((x) => x.t === 'F').map((x) => ({ i: x.i, l: x.l, per: perWorker(x.l) * (1 + irrigation(f, x.i)), cap: slots(x.l), w: 0 }));
  fields.sort((a, b) => b.per - a.per);
  let left = Math.min(f.w, houses(f));
  for (const x of fields) { x.w = Math.min(x.cap, left); left -= x.w; }
  return { fields, idle: Math.max(0, Math.min(f.w, houses(f)) - fields.reduce((a, x) => a + x.w, 0)), homeless: Math.max(0, f.w - houses(f)) };
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
  const produce = (until) => {
    const dt = (until - f.t) / HOUR;
    if (dt > 0) {
      const cap = capacity(f), p = productionPerHour(f) * dt;
      const room = Math.max(0, cap - f.b), got = Math.min(room, p);
      f.b += got; f.tot += got;
    }
    f.t = until;
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
export function canBuild(f, i, t) {
  if (!f.own.includes(i)) return 'Case pas encore achetée';
  if (tile(f, i) || f.q.some((q) => q.i === i)) return 'Case occupée';
  if (B[t].unique && countType(f, t) >= 1) return `Un seul ${B[t].name.toLowerCase()} par ferme`;
  if (f.q.length >= f.bu) return 'Tous tes bâtisseurs sont occupés';
  if (f.b < costOf(f, t, 1)) return 'Pas assez de bananes';
  return null;
}
export function build(f, i, t, now = Date.now()) {
  const err = canBuild(f, i, t);
  if (err) return err;
  f.b -= costOf(f, t, 1);
  f.q.push({ i, t, l: 1, end: now + timeOf(t, 1), start: now });
  return null;
}
export function canUpgrade(f, i) {
  const x = tile(f, i);
  if (!x) return 'Rien à améliorer ici';
  if (x.l >= B[x.t].max) return 'Niveau maximum';
  if (f.q.some((q) => q.i === i)) return 'Déjà en travaux';
  if (f.q.length >= f.bu) return 'Tous tes bâtisseurs sont occupés';
  if (f.b < costOf(f, x.t, x.l + 1)) return 'Pas assez de bananes';
  return null;
}
export function upgrade(f, i, now = Date.now()) {
  const err = canUpgrade(f, i);
  if (err) return err;
  const x = tile(f, i);
  f.b -= costOf(f, x.t, x.l + 1);
  f.q.push({ i, t: x.t, l: x.l + 1, end: now + timeOf(x.t, x.l + 1), start: now });
  return null;
}
export function hire(f) {
  if (f.w >= houses(f)) return 'Plus de place dans les cabanes';
  const c = hireCost(f.w);
  if (f.b < c) return 'Pas assez de bananes';
  f.b -= c; f.w += 1;
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
// Score affiché dans le classement des fermes
export const farmScore = (f) => Math.round(f.rate || productionPerHour(f));
export const levels = (f) => built(f).reduce((a, x) => a + x.l, 0);
