// Jeux à gratter : tickets, tables de gains et fabrication d'un ticket.
// Gagné si 3 montants identiques apparaissent sur le ticket (un seul gain possible par ticket).
// La probabilité du lot « remboursé » (×1) est calculée pour que le RTP fasse exactement 98 %.
import { randInt } from './slots-math.js';

export const RTP = 0.98;
const T = (id, name, price, cols, rows, prizes, theme) => {
  const rest = prizes.reduce((a, x) => a + x.m * x.p, 0);
  const all = [{ m: 1, p: RTP - rest }, ...prizes];
  return { id, name, price, cols, rows, cells: cols * rows, prizes: all, theme, hit: all.reduce((a, x) => a + x.p, 0), max: Math.max(...all.map((x) => x.m)) };
};
export const TICKETS = [
  T('banane', 'Banane Express', 10, 3, 3, [{ m: 2, p: 0.117 }, { m: 5, p: 0.0356 }, { m: 10, p: 0.0145 }, { m: 50, p: 0.0018 }, { m: 500, p: 0.00009 }], 'banane'),
  T('singe', 'Singe d\'Or', 100, 3, 3, [{ m: 2, p: 0.1067 }, { m: 4, p: 0.0433 }, { m: 10, p: 0.0132 }, { m: 25, p: 0.004 }, { m: 100, p: 0.00066 }, { m: 1000, p: 0.000033 }], 'singe'),
  T('tresor', 'Trésor de la Jungle', 1000, 4, 3, [{ m: 2, p: 0.1045 }, { m: 5, p: 0.0318 }, { m: 10, p: 0.0129 }, { m: 20, p: 0.0052 }, { m: 100, p: 0.00065 }, { m: 500, p: 0.00008 }, { m: 10000, p: 0.000002 }], 'tresor'),
];
export const rtpOf = (t) => t.prizes.reduce((a, x) => a + x.m * x.p, 0);

const rnd = () => randInt(1e9) / 1e9;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Tirage du lot, puis remplissage des cases : 3 fois le lot gagnant, les autres montants au plus 2 fois chacun
export function makeTicket(t) {
  let x = rnd(), win = 0;
  for (const pz of t.prizes) { if (x < pz.p) { win = pz.m; break; } x -= pz.p; }
  const values = t.prizes.map((pz) => pz.m);
  const cells = [];
  if (win) cells.push(win, win, win);
  const count = {};
  cells.forEach((m) => (count[m] = (count[m] || 0) + 1));
  // montants « leurres » : surtout les petits, parfois un gros pour faire rêver
  const decoys = values.filter((m) => m !== win);
  while (cells.length < t.cells) {
    const pool = decoys.filter((m) => (count[m] || 0) < 2);
    const weights = pool.map((m) => 1 / Math.sqrt(m));
    let r = rnd() * weights.reduce((a, b) => a + b, 0), k = 0;
    while ((r -= weights[k]) > 0 && k < pool.length - 1) k++;
    const m = pool[k];
    cells.push(m); count[m] = (count[m] || 0) + 1;
  }
  return { ticket: t.id, win, payout: win * t.price, cells: shuffle(cells) };
}
