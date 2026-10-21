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
      i = E.sit(t, { uid, name: String(ctx.name || 'Joueur').slice(0, 20) }, t.buyIn, now);
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
