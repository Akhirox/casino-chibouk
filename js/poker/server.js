// Poker et Jetons Poker (JP) : traitement des demandes des joueurs, sans accès réseau.
// Les Cloud Functions (functions/index.js) lisent les documents, appellent process() puis écrivent le résultat,
// le tout dans une transaction. Le mode démo local fait pareil avec le stockage du navigateur.
import * as E from './engine.js';

// Tables ouvertes en permanence (cave fixe, blindes fixes, 6 places)
export const ROOMS = [
  { id: 'lianes', name: 'Table des Lianes', buyIn: 50, sb: 1, bb: 2 },
  { id: 'bananier', name: 'Table du Bananier', buyIn: 100, sb: 1, bb: 2 },
  { id: 'cocotier', name: 'Table du Cocotier', buyIn: 500, sb: 5, bb: 10 },
  { id: 'baobab', name: 'Table du Baobab', buyIn: 2500, sb: 25, bb: 50 },
  { id: 'roisinge', name: 'Table du Roi Singe', buyIn: 10000, sb: 100, bb: 200 },
].map((r) => ({ ...r, max: 6 }));
export const roomCfg = (id) => ROOMS.find((r) => r.id === id) || null;
export const freshTable = (id) => E.makeTable(roomCfg(id));

// Boutique poker (V36) : cosmétiques payés en JP. Le prix est vérifié par le serveur.
//  ptitle : titre sous ton pseudo à la table · pframe : cadre de ton avatar à la table
//  pback  : dos de tes cartes (ce que les autres voient) · pfelt : couleur du tapis (ta vue de la table)
export const POKER_CATS = {
  ptitle: { name: 'Titres de table', desc: 'Affiché sous ton pseudo à la table de poker.' },
  pframe: { name: 'Cadres de table', desc: 'Autour de ton avatar à la table de poker.' },
  pback: { name: 'Dos de cartes', desc: 'Le dos de tes cartes cachées, tel que les autres joueurs le voient.' },
  pfelt: { name: 'Tapis', desc: 'La couleur du tapis quand tu regardes une table (ta vue seulement).' },
};
export const POKER_ITEMS = [
  { id: 'pt-none', cat: 'ptitle', name: 'Sans titre', price: 0 },
  { id: 'pt-requin', cat: 'ptitle', name: 'Petit requin', price: 300 },
  { id: 'pt-bluff', cat: 'ptitle', name: 'Bluffeur de la canopée', price: 700 },
  { id: 'pt-tapis', cat: 'ptitle', name: 'Toujours à tapis', price: 1500 },
  { id: 'pt-river', cat: 'ptitle', name: 'Roi de la river', price: 3000 },
  { id: 'pt-silver', cat: 'ptitle', name: 'Dos argenté', price: 6000 },
  { id: 'pt-legend', cat: 'ptitle', name: 'Légende du Hold\'em', price: 15000 },
  { id: 'pf-none', cat: 'pframe', name: 'Sans cadre', price: 0 },
  { id: 'pf-felt', cat: 'pframe', name: 'Feutrine', price: 400 },
  { id: 'pf-chips', cat: 'pframe', name: 'Pile de jetons', price: 1200 },
  { id: 'pf-royal', cat: 'pframe', name: 'Quinte royale', price: 3000 },
  { id: 'pf-flame', cat: 'pframe', name: 'Flamme bleue', price: 6500 },
  { id: 'pf-diamond', cat: 'pframe', name: 'Diamant noir', price: 15000 },
  { id: 'pb-blue', cat: 'pback', name: 'Bleu classique', price: 0 },
  { id: 'pb-red', cat: 'pback', name: 'Rouge casino', price: 300 },
  { id: 'pb-banana', cat: 'pback', name: 'Bananes', price: 900 },
  { id: 'pb-jungle', cat: 'pback', name: 'Feuilles de jungle', price: 2000 },
  { id: 'pb-gold', cat: 'pback', name: 'Or', price: 4500 },
  { id: 'pb-king', cat: 'pback', name: 'Roi Singe', price: 10000 },
  { id: 'pfe-green', cat: 'pfelt', name: 'Vert classique', price: 0 },
  { id: 'pfe-blue', cat: 'pfelt', name: 'Bleu casino', price: 500 },
  { id: 'pfe-red', cat: 'pfelt', name: 'Rouge Las Vegas', price: 800 },
  { id: 'pfe-purple', cat: 'pfelt', name: 'Violet royal', price: 1500 },
  { id: 'pfe-black', cat: 'pfelt', name: 'Noir et or', price: 3500 },
  { id: 'pfe-jungle', cat: 'pfelt', name: 'Jungle', price: 7000 },
];
export const pokerItem = (id) => POKER_ITEMS.find((x) => x.id === id) || null;
const DEFAULT_EQ = { ptitle: 'pt-none', pframe: 'pf-none', pback: 'pb-blue', pfelt: 'pfe-green' };
export const pokerEq = (jp, cat) => { const id = jp && jp.eq && jp.eq[cat]; const it = pokerItem(id); return it && it.cat === cat ? id : DEFAULT_EQ[cat]; };
export const ownsPoker = (jp, id) => { const it = pokerItem(id); return !!it && (it.price === 0 || !!(jp && jp.own && jp.own[id])); };
// ce que les autres voient de toi à la table
export const seatCos = (jp) => ({ t: pokerEq(jp, 'ptitle'), f: pokerEq(jp, 'pframe'), b: pokerEq(jp, 'pback') });
// Achat ou équipement. Renvoie { err } ou { cost, set (champs du document JP), cos (à recopier sur ta place) }
export function shopOp(jp, op, id) {
  jp = jp || {};
  const it = pokerItem(id);
  if (!it) return { err: 'Objet inconnu' };
  const eq = { ...(jp.eq || {}), [it.cat]: id };
  if (op === 'equip') {
    if (!ownsPoker(jp, id)) return { err: 'Tu ne possèdes pas cet objet' };
    return { cost: 0, set: { eq }, cos: seatCos({ ...jp, eq }) };
  }
  if (op === 'buy') {
    if (ownsPoker(jp, id)) return { err: 'Tu possèdes déjà cet objet' };
    const bal = Math.floor(jp.jp || 0);
    if (bal < it.price) return { err: `Il te faut ${it.price.toLocaleString('fr-FR')} JP (tu en as ${bal.toLocaleString('fr-FR')})` };
    return { cost: it.price, set: { eq, own: { ...(jp.own || {}), [id]: Date.now() } }, cos: seatCos({ ...jp, eq }) };
  }
  return { err: 'Demande inconnue' };
}

// Gains de JP : montants fixes, aucun bonus ni multiplicateur
export const JP_WHEEL_MIN = 50, JP_WHEEL_MAX = 200, JP_WHEEL_STEP = 10;
export const JP_GAME = 10, JP_GAME_COOLDOWN = 30000; // 10 JP par mini-jeu terminé, au plus un toutes les 30 s
export const parisDay = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));

// Gain de JP. jp = document du joueur ({ jp, wheelDay, lastGame… }). Renvoie { err } ou { amount, set }
export function earn(jp, kind, now, rand) {
  jp = jp || {};
  if (kind === 'wheel') {
    const day = parisDay(now);
    if (jp.wheelDay === day) return { err: 'JP de la roue déjà reçus aujourd\'hui', amount: 0 };
    const steps = (JP_WHEEL_MAX - JP_WHEEL_MIN) / JP_WHEEL_STEP + 1;
    const amount = JP_WHEEL_MIN + JP_WHEEL_STEP * rand(steps);
    return { amount, set: { wheelDay: day } };
  }
  if (kind === 'game') {
    const wait = (jp.lastGame || 0) + JP_GAME_COOLDOWN - now;
    if (wait > 0) return { amount: 0, wait };
    return { amount: JP_GAME, set: { lastGame: now } };
  }
  return { err: 'Gain inconnu', amount: 0 };
}

/**
 * Une demande d'un joueur sur une table.
 * ctx = { op, uid, name, now, rand, table, secret, jp (document JP du joueur), busyElsewhere (assis à une autre table), data }
 * Renvoie { err } ou { table, secret, jpDelta: { uid: ±JP }, room: { uid: id | null }, priv: { uid: [cartes] }, changed, info }
 */
export function process(ctx) {
  const { op, uid, now, rand, data = {} } = ctx;
  const t = ctx.table, sec = ctx.secret || E.newSecret();
  const out = { table: t, secret: sec, jpDelta: {}, room: {}, priv: {}, changed: false, info: null };
  const add = (u, d) => { if (d) out.jpDelta[u] = (out.jpDelta[u] || 0) + d; };
  const bal = Math.floor((ctx.jp && ctx.jp.jp) || 0);
  let i = E.seatOf(t, uid);
  const fail = (err) => ({ err });

  switch (op) {
    case 'join': {
      if (i >= 0) { out.room[uid] = t.id; break; }
      if (ctx.busyElsewhere) return fail('Tu es déjà assis à une autre table : quitte-la d\'abord');
      if (E.seatedCount(t) >= t.max) return fail('Table complète');
      if (bal < t.buyIn) return fail(`Il te faut ${t.buyIn.toLocaleString('fr-FR')} JP pour t'asseoir (tu en as ${bal.toLocaleString('fr-FR')})`);
      i = E.sit(t, { uid, name: String(ctx.name || 'Joueur').slice(0, 20) }, t.buyIn, now, seatCos(ctx.jp));
      if (i < 0) return fail('Table complète');
      add(uid, -t.buyIn); out.room[uid] = t.id; out.changed = true;
      break;
    }
    case 'leave': {
      out.room[uid] = null;
      if (i < 0) break;
      add(uid, E.leave(t, sec, i, now)); out.changed = true;
      break;
    }
    case 'rebuy': {
      if (i < 0) return fail('Tu n\'es pas assis à cette table');
      if (bal < t.buyIn) return fail(`Il te faut ${t.buyIn.toLocaleString('fr-FR')} JP pour te recaver`);
      const err = E.rebuy(t, i, now);
      if (err) return fail(err);
      add(uid, -t.buyIn); out.changed = true;
      break;
    }
    case 'away': case 'back': {
      if (i < 0) return fail('Tu n\'es pas assis à cette table');
      E.setAway(t, i, op === 'away', now); out.changed = true;
      break;
    }
    case 'act': {
      if (i < 0) return fail('Tu n\'es pas assis à cette table');
      if (data.hand !== t.hand) return fail('Cette main est terminée');
      const s = t.seats[i];
      const err = E.act(t, sec, i, data.a, data.to, now);
      if (err) return fail(err);
      s.to = 0; if (s.out && !s.left) { s.out = false; s.outAt = 0; } // il joue : il n'est plus absent
      out.changed = true;
      break;
    }
    case 'tick': break;
    case 'cos': { // cosmétiques changés pendant que tu es assis (toujours relus dans ton document JP, jamais envoyés par la page)
      if (i < 0) break;
      t.seats[i].cos = seatCos(ctx.jp); out.changed = true;
      break;
    }
    default: return fail('Demande inconnue');
  }
  // entretien à chaque passage : temps écoulés, nouvelle main, places libérées
  const tk = E.tick(t, sec, now, rand);
  if (tk.changed) out.changed = true;
  for (const r of tk.removed) { add(r.uid, r.refund); out.room[r.uid] = null; }
  if (tk.priv) Object.assign(out.priv, tk.priv);
  if (out.changed) t.at = now;
  return out;
}

// Vue d'une table pour le salon (nombre de joueurs assis…)
export const lobbyInfo = (t) => ({ id: t.id, players: E.seatedCount(t), playing: t.seats.filter((s) => s && s.in).length, hand: t.hand || 0 });
