// Cloud Functions du Casino Chibouk : poker Texas Hold'em entre joueurs et Jetons Poker (JP).
// Le serveur est le seul à connaître le paquet et les cartes des autres : les joueurs ne peuvent pas tricher en lisant
// la base. Toutes les règles sont dans shared/ (copie de js/poker, mise à jour à chaque « firebase deploy »).
//
// Documents :
//   poker/{table}               état public de la table (lisible par tous les joueurs connectés)
//   poker/{table}/hands/{uid}   tes 2 cartes (lisible par toi seul)
//   pokerSecret/{table}         paquet et cartes de chacun (personne ne peut le lire, sauf le serveur)
//   jp/{uid}                    solde de JP, table où tu es assis, dernier gain (écrit par le serveur seulement)
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import * as S from './shared/server.js';

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
setGlobalOptions({ region: 'europe-west1', maxInstances: 10, memory: '256MiB' });
const rand = (n) => randomInt(n); // tirage cryptographique : paquet imprévisible

export const poker = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connecte-toi pour jouer');
  const { op, room, ...data } = req.data || {};
  if (op === 'earn') return earnJP(uid, data.kind);
  if (op === 'buy' || op === 'equip') return shopJP(uid, op, data.item);
  if (!S.roomCfg(room)) throw new HttpsError('invalid-argument', 'Table inconnue');
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const tRef = db.doc(`poker/${room}`), sRef = db.doc(`pokerSecret/${room}`), jRef = db.doc(`jp/${uid}`);
    const [tS, sS, jS] = await Promise.all([tx.get(tRef), tx.get(sRef), tx.get(jRef)]);
    const jp = jS.exists ? jS.data() : {};
    let name = '', busy = false;
    if (op === 'join' || op === 'rebuy') {
      const uS = await tx.get(db.doc(`users/${uid}`));
      if (!uS.exists) throw new HttpsError('failed-precondition', 'Profil introuvable');
      const u = uS.data();
      if (u.banned) throw new HttpsError('permission-denied', 'Compte suspendu');
      name = u.pseudo || 'Joueur';
      // déjà assis ailleurs ? (on vérifie la table indiquée, au cas où l'info serait périmée)
      if (op === 'join' && jp.room && jp.room !== room) {
        const oS = await tx.get(db.doc(`poker/${jp.room}`));
        busy = oS.exists && (oS.data().seats || []).some((s) => s && s.uid === uid);
      }
    }
    const table = tS.exists ? tS.data() : S.freshTable(room);
    // réglages de la table toujours à jour (cave et blindes)
    const cfg = S.roomCfg(room);
    Object.assign(table, { name: cfg.name, sb: cfg.sb, bb: cfg.bb, buyIn: cfg.buyIn, max: cfg.max });
    const secret = sS.exists ? sS.data() : null;
    const out = S.process({ op, uid, name, now, rand, table, secret, jp, busyElsewhere: busy, data });
    if (out.err) return { ok: false, error: out.err };
    writeOut(tx, room, out, !tS.exists);
    return { ok: true };
  });
});

// Écrit le résultat d'une demande : table, paquet, JP des joueurs concernés, cartes distribuées
function writeOut(tx, room, out, force = false) {
  if (out.changed || force) { tx.set(db.doc(`poker/${room}`), out.table); tx.set(db.doc(`pokerSecret/${room}`), out.secret); }
  // JP : caves payées (pin) et tapis rendus (pout), table où chacun est assis
  const users = new Set([...Object.keys(out.jpDelta), ...Object.keys(out.room)]);
  for (const u of users) {
    const d = out.jpDelta[u] || 0, upd = {};
    if (d) { upd.jp = FieldValue.increment(d); upd[d < 0 ? 'pin' : 'pout'] = FieldValue.increment(Math.abs(d)); }
    if (u in out.room) upd.room = out.room[u] || FieldValue.delete();
    tx.set(db.doc(`jp/${u}`), upd, { merge: true });
  }
  for (const [u, cards] of Object.entries(out.priv)) tx.set(db.doc(`poker/${room}/hands/${u}`), { room, hand: out.table.hand, cards });
}

// Boutique poker : achat (payé en JP, prix vérifié ici) et équipement. Si tu es assis, ta place est mise à jour.
async function shopJP(uid, op, item) {
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const jRef = db.doc(`jp/${uid}`);
    const jS = await tx.get(jRef);
    const jp = jS.exists ? jS.data() : {};
    const r = S.shopOp(jp, op, item);
    if (r.err) return { ok: false, error: r.err };
    let tableOut = null;
    if (jp.room && S.roomCfg(jp.room)) {
      const [tS, sS] = await Promise.all([tx.get(db.doc(`poker/${jp.room}`)), tx.get(db.doc(`pokerSecret/${jp.room}`))]);
      if (tS.exists) {
        const out = S.process({ op: 'cos', uid, now, rand, table: tS.data(), secret: sS.exists ? sS.data() : null, jp: { ...jp, ...r.set }, data: {} });
        if (!out.err) tableOut = out;
      }
    }
    // ton document JP d'abord (writeOut peut y ajouter des JP rendus : les incréments s'additionnent)
    tx.set(jRef, { ...r.set, ...(r.cost ? { jp: FieldValue.increment(-r.cost), spent: FieldValue.increment(r.cost) } : {}) }, { merge: true });
    if (tableOut) writeOut(tx, jp.room, tableOut);
    return { ok: true, cost: r.cost };
  });
}

// Gains de JP : roue du jour (une fois par jour, montant tiré ici) et mini-jeux terminés (10 JP, un toutes les 30 s)
async function earnJP(uid, kind) {
  const ref = db.doc(`jp/${uid}`);
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const snap = await tx.get(ref);
    const r = S.earn(snap.exists ? snap.data() : {}, kind, now, rand);
    if (r.err) return { ok: false, error: r.err, amount: 0 };
    if (r.amount > 0) tx.set(ref, { jp: FieldValue.increment(r.amount), earned: FieldValue.increment(r.amount), ...r.set }, { merge: true });
    return { ok: true, amount: r.amount, wait: r.wait || 0 };
  });
}
