// Poker en mode démo (sans Firebase) : même règles que le serveur, tables gardées dans le navigateur,
// et quelques singes robots pour pouvoir jouer seul. N'est jamais utilisé avec la vraie base.
import * as E from './engine.js';
import * as S from './server.js';

const K = 'chibouk_demo_poker', KJ = 'chibouk_demo_jp';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const rand = (n) => Math.floor(Math.random() * n);
const BOTS = ['Bonobo', 'Ouistiti', 'Gorille', 'Macaque', 'Mandrill', 'Capucin'];
const DEMO_START_JP = 500; // en démo seulement : de quoi essayer tout de suite

export function createDemoPoker(session) {
  const subs = new Set();
  const notify = () => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  const db = () => read(K, { tables: {}, secrets: {}, hands: {} });
  const jps = () => read(KJ, {});
  const jpOf = (uid) => { const j = jps(); return j[uid] || { jp: DEMO_START_JP }; };
  const isBot = (uid) => String(uid).startsWith('bot_');

  function run(op, room, uid, name, data = {}) {
    const d = db(), j = jps();
    const table = d.tables[room] || S.freshTable(room);
    const jp = j[uid] || { jp: DEMO_START_JP };
    const busy = op === 'join' && jp.room && jp.room !== room && d.tables[jp.room] && E.seatOf(d.tables[jp.room], uid) >= 0;
    const out = S.process({ op, uid, name, now: Date.now(), rand, table, secret: d.secrets[room], jp: isBot(uid) ? { jp: 1e9 } : jp, busyElsewhere: busy, data });
    if (out.err) return { ok: false, error: out.err };
    d.tables[room] = out.table; d.secrets[room] = out.secret;
    for (const [u, cards] of Object.entries(out.priv)) (d.hands[room] = d.hands[room] || {})[u] = { room, hand: out.table.hand, cards };
    for (const u of new Set([...Object.keys(out.jpDelta), ...Object.keys(out.room)])) {
      if (isBot(u)) continue;
      const x = j[u] || { jp: DEMO_START_JP };
      const dl = out.jpDelta[u] || 0;
      x.jp = (x.jp || 0) + dl; if (dl) x[dl < 0 ? 'pin' : 'pout'] = (x[dl < 0 ? 'pin' : 'pout'] || 0) + Math.abs(dl);
      if (u in out.room) { if (out.room[u]) x.room = out.room[u]; else delete x.room; }
      j[u] = x;
    }
    write(K, d); write(KJ, j);
    if (out.changed || Object.keys(out.jpDelta).length || Object.keys(out.room).length) notify();
    return { ok: true };
  }

  // Robots : jouent leur tour après un petit temps de réflexion, se recavent quand ils n'ont plus rien
  function botMove(t, sec, i) {
    const o = E.options(t, i), c = (sec.cards || {})[i];
    if (!o || !c) return { a: 'fold' };
    let str;
    if (!t.board.length) { const [a, b] = c.map(E.rankOf); str = a === b ? 0.55 + a / 30 : (Math.max(a, b) + Math.min(a, b) / 2) / 24 + (c[0][1] === c[1][1] ? 0.05 : 0); }
    else str = [0.25, 0.55, 0.7, 0.8, 0.86, 0.88, 0.93, 0.97, 1][E.evaluate([...c, ...t.board]).cat];
    const r = Math.random(), raiseTo = Math.min(o.maxTo, Math.max(o.minTo, t.curBet + Math.round(t.pot * (0.5 + Math.random() * 0.5))));
    if (o.toCall === 0) return str > 0.68 && r < 0.45 && o.canRaise ? { a: 'raise', to: raiseTo } : { a: 'check' };
    const odds = o.toCall / (t.pot + o.toCall);
    if (str < odds + 0.12 && r > 0.12) return { a: 'fold' };
    if (str > 0.84 && r < 0.4 && o.canRaise) return { a: 'raise', to: raiseTo };
    return { a: 'call' };
  }
  let botAt = {};
  setInterval(() => {
    const d = db();
    for (const [room, t] of Object.entries(d.tables)) {
      if (!t.seats.some((s) => s && !isBot(s.uid))) continue; // personne de réel à cette table : on ne fait rien
      const i = t.toAct, s = i >= 0 ? t.seats[i] : null;
      if (s && isBot(s.uid) && E.BETTING.includes(t.stage)) {
        const key = room + ':' + t.hand + ':' + t.stage + ':' + i + ':' + t.curBet;
        if (!botAt[key]) botAt[key] = Date.now() + 500 + rand(900);
        if (Date.now() >= botAt[key]) { delete botAt[key]; const m = botMove(t, d.secrets[room], i); run('act', room, s.uid, s.name, { hand: t.hand, ...m }); continue; }
      }
      if (t.stage === 'end' || t.stage === 'idle') t.seats.forEach((x) => { if (x && isBot(x.uid) && x.bust) run('rebuy', room, x.uid, x.name); });
      run('tick', room, 'system', '');
    }
  }, 400);

  return {
    async pokerCall(op, room, data = {}) {
      const s = session();
      if (!s) return { ok: false, error: 'Connecte-toi pour jouer' };
      if (op === 'earn') {
        const j = jps(), x = j[s.uid] || { jp: DEMO_START_JP };
        const r = S.earn(x, data.kind, Date.now(), rand);
        if (r.err) return { ok: false, error: r.err, amount: 0 };
        if (r.amount) { Object.assign(x, r.set, { jp: (x.jp || 0) + r.amount, earned: (x.earned || 0) + r.amount }); j[s.uid] = x; write(KJ, j); notify(); }
        return { ok: true, amount: r.amount, wait: r.wait || 0 };
      }
      if (!S.roomCfg(room)) return { ok: false, error: 'Table inconnue' };
      const res = run(op, room, s.uid, s.pseudo, data);
      // démo : des robots viennent s'asseoir pour qu'on puisse jouer seul
      if (res.ok && op === 'join') {
        const t = db().tables[room];
        const taken = new Set(t.seats.filter(Boolean).map((x) => x.name));
        let need = Math.max(0, 4 - E.seatedCount(t));
        for (const b of BOTS) { if (!need) break; if (taken.has(b)) continue; run('join', room, 'bot_' + b.toLowerCase(), b); need--; }
      }
      return res;
    },
    watchJP(uid, cb) { const f = () => cb(jpOf(uid)); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    watchPokerLobby(cb) { const f = () => cb(db().tables); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    watchPokerTable(room, cb) { const f = () => cb(db().tables[room] || null); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    watchPokerHand(room, uid, cb) { const f = () => cb(((db().hands[room] || {})[uid]) || null); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
  };
}
