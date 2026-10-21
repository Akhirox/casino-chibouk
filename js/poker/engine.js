// Poker Texas Hold'em No Limit : règles pures (aucun affichage, aucun accès réseau).
// Utilisé tel quel par les Cloud Functions (serveur, seul à connaître le paquet) et par le mode démo local.
//
// Table (publique, lisible par tous) : places, mises, tableau, pot, à qui de jouer… mais jamais les cartes cachées.
// Secret (serveur seulement) : le paquet restant et les cartes de chaque place.

export const TURN_MS = 30000;        // temps pour jouer
export const AWAY_TURN_MS = 1500;    // joueur absent : il passe ou se couche tout de suite
export const END_MS = 8000;          // pause entre deux mains (V36 : 8 s, le temps de voir les cartes et de se recaver)
export const SHOWDOWN_MS = 8000;
export const START_MS = 3000;        // 2 joueurs prêts : la première main démarre 3 s plus tard (le temps que d'autres s'assoient)
export const AWAY_KICK_MS = 10 * 60000;  // absent plus de 10 min : retiré de la table (son tapis lui est rendu)
export const BUST_KICK_MS = 3 * 60000;   // tapis vide sans recave pendant 3 min : place libérée
export const TIMEOUTS_TO_AWAY = 2;   // 2 temps écoulés de suite : le joueur passe « absent »
const LOG_MAX = 30;

export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const rankOf = (c) => RANKS.indexOf(c[0]) + 2;
export const newDeck = () => { const d = []; for (const s of SUITS) for (const r of RANKS) d.push(r + s); return d; };
export function shuffle(deck, rand) { for (let i = deck.length - 1; i > 0; i--) { const j = rand(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; } return deck; }

/* ------------------------------ évaluation des mains ------------------------------ */
const WORD = { 14: 'As', 13: 'Roi', 12: 'Dame', 11: 'Valet', 10: '10', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };
const PLURAL = { 14: 'As', 13: 'Rois', 12: 'Dames', 11: 'Valets' };
const pl = (v) => PLURAL[v] || WORD[v];
const de = (v) => (v === 14 ? 'd\'As' : `de ${pl(v)}`);
const aux = (v) => `aux ${pl(v)}`;
export const CATS = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];

function straightHigh(vals) { // vals : Set de valeurs
  for (let h = 14; h >= 5; h--) {
    let ok = true;
    for (let k = 0; k < 5; k++) { const v = h - k === 1 ? 14 : h - k; if (!vals.has(v)) { ok = false; break; } }
    if (ok) return h;
  }
  return 0;
}
// Meilleure main de 5 cartes parmi 5 à 7 : { score (plus grand = meilleur), cat, name }
export function evaluate(cards) {
  const vals = cards.map(rankOf), bySuit = {};
  cards.forEach((c) => { (bySuit[c[1]] = bySuit[c[1]] || []).push(rankOf(c)); });
  const enc = (cat, ks) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (ks[i] || 0); return s; };
  const fl = Object.values(bySuit).find((a) => a.length >= 5);
  if (fl) {
    const sh = straightHigh(new Set(fl));
    if (sh) return { score: enc(8, [sh]), cat: 8, name: sh === 14 ? 'Quinte flush royale' : `Quinte flush hauteur ${WORD[sh]}` };
  }
  const cnt = {};
  vals.forEach((v) => (cnt[v] = (cnt[v] || 0) + 1));
  const groups = Object.entries(cnt).map(([v, n]) => [+v, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const desc = [...new Set(vals)].sort((a, b) => b - a);
  const rest = (ex, n) => desc.filter((v) => !ex.includes(v)).slice(0, n);
  if (groups[0][1] === 4) { const q = groups[0][0]; return { score: enc(7, [q, ...rest([q], 1)]), cat: 7, name: `Carré ${de(q)}` }; }
  if (groups[0][1] === 3) {
    const t = groups[0][0], p = groups.slice(1).find((g) => g[1] >= 2);
    if (p) return { score: enc(6, [t, p[0]]), cat: 6, name: `Full ${aux(t)} par les ${pl(p[0])}` };
  }
  if (fl) { const ks = [...fl].sort((a, b) => b - a).slice(0, 5); return { score: enc(5, ks), cat: 5, name: `Couleur hauteur ${WORD[ks[0]]}` }; }
  const sh = straightHigh(new Set(vals));
  if (sh) return { score: enc(4, [sh]), cat: 4, name: `Quinte hauteur ${WORD[sh]}` };
  if (groups[0][1] === 3) { const t = groups[0][0]; return { score: enc(3, [t, ...rest([t], 2)]), cat: 3, name: `Brelan ${de(t)}` }; }
  if (groups[0][1] === 2 && groups[1] && groups[1][1] === 2) {
    const a = groups[0][0], b = groups[1][0];
    return { score: enc(2, [a, b, ...rest([a, b], 1)]), cat: 2, name: `Double paire ${pl(a)} et ${pl(b)}` };
  }
  if (groups[0][1] === 2) { const p = groups[0][0]; return { score: enc(1, [p, ...rest([p], 3)]), cat: 1, name: `Paire ${de(p)}` }; }
  return { score: enc(0, desc.slice(0, 5)), cat: 0, name: `Hauteur ${WORD[desc[0]]}` };
}

/* ------------------------------ table ------------------------------ */
export function makeTable(cfg) {
  return { id: cfg.id, name: cfg.name, sb: cfg.sb, bb: cfg.bb, buyIn: cfg.buyIn, max: cfg.max || 6,
    seats: Array(cfg.max || 6).fill(null), hand: 0, stage: 'idle', button: -1, toAct: -1, deadline: 0,
    curBet: 0, minRaise: cfg.bb, board: [], pot: 0, result: null, log: [], next: 0, at: 0 };
}
export const newSecret = () => ({ deck: [], cards: {} });
export const BETTING = ['preflop', 'flop', 'turn', 'river'];
export const seatOf = (t, uid) => t.seats.findIndex((s) => s && s.uid === uid);
export const seatedCount = (t) => t.seats.filter(Boolean).length;
const dealable = (s) => s && !s.out && !s.left && !s.bust && s.stack > 0;
const canAct = (s) => s && s.in && !s.folded && !s.allin;
const live = (t) => t.seats.map((s, i) => [s, i]).filter(([s]) => s && s.in && !s.folded);
function nextIdx(t, from, ok) { const n = t.seats.length; for (let k = 1; k <= n; k++) { const i = (from + k + n) % n; if (ok(t.seats[i], i)) return i; } return -1; }
function log(t, txt) { t.log = [...(t.log || []), txt].slice(-LOG_MAX); }
const name = (s) => s.name || 'Joueur';
const fmtN = (n) => Math.round(n).toLocaleString('fr-FR');
const updatePot = (t) => { t.pot = t.seats.reduce((a, s) => a + (s && s.in ? s.contrib : 0), 0) + (t.dead || 0); };

// Assoit un joueur (tapis = cave). Renvoie l'index de la place, ou -1 si la table est pleine.
export function sit(t, p, stack, now, cos = null) {
  let i = seatOf(t, p.uid);
  if (i >= 0) return i;
  i = t.seats.findIndex((s) => !s);
  if (i < 0) return -1;
  t.seats[i] = { uid: p.uid, name: p.name, stack, bet: 0, contrib: 0, in: false, folded: false, allin: false, acted: false, noRaise: false,
    out: false, outAt: 0, to: 0, bust: false, bustAt: 0, left: false, shown: null, last: '', joinedAt: now, ...(cos ? { cos } : {}) };
  log(t, `${p.name} s'assoit (${fmtN(stack)} JP)`);
  return i;
}

// Nouvelle main si au moins 2 joueurs peuvent jouer. Renvoie les cartes à envoyer à chacun ({ uid: [c1, c2] }) ou null.
export function startHand(t, sec, now, rand) {
  // places libérées : joueurs partis pendant la main précédente
  t.seats = t.seats.map((s) => (s && s.left ? null : s));
  const ids = t.seats.map((s, i) => (dealable(s) ? i : -1)).filter((i) => i >= 0);
  t.seats.forEach((s) => { if (s) Object.assign(s, { bet: 0, contrib: 0, in: false, folded: false, allin: false, acted: false, noRaise: false, shown: null, last: '' }); });
  t.board = []; t.result = null; t.pot = 0; t.curBet = 0; t.minRaise = t.bb; t.dead = 0;
  if (ids.length < 2) { t.stage = 'idle'; t.toAct = -1; t.deadline = 0; t.next = 0; return null; }
  t.hand = (t.hand || 0) + 1;
  ids.forEach((i) => { t.seats[i].in = true; });
  t.button = nextIdx(t, t.button < 0 ? -1 : t.button, (s) => s && s.in);
  const hu = ids.length === 2;
  const sbI = hu ? t.button : nextIdx(t, t.button, (s) => s && s.in);
  const bbI = nextIdx(t, sbI, (s) => s && s.in);
  sec.deck = shuffle(newDeck(), rand); sec.cards = {};
  const priv = {};
  for (let r = 0; r < 2; r++) for (let k = 0, i = sbI; k < ids.length; k++, i = nextIdx(t, i, (s) => s && s.in)) (sec.cards[i] = sec.cards[i] || []).push(sec.deck.pop());
  ids.forEach((i) => { priv[t.seats[i].uid] = sec.cards[i]; });
  const post = (i, amt, label) => { const s = t.seats[i], a = Math.min(amt, s.stack); s.stack -= a; s.bet += a; s.contrib += a; if (!s.stack) s.allin = true; s.last = `${label} ${fmtN(a)}`; };
  post(sbI, t.sb, 'Petite blinde'); post(bbI, t.bb, 'Grosse blinde');
  t.sbI = sbI; t.bbI = bbI;
  t.curBet = t.bb; t.minRaise = t.bb; t.stage = 'preflop'; t.next = 0;
  log(t, `— Main n° ${t.hand} · ${ids.length} joueurs · bouton : ${name(t.seats[t.button])}`);
  updatePot(t);
  setTurn(t, nextIdx(t, bbI, (s) => canAct(s)), now, sec);
  return priv;
}

// Le joueur suivant qui doit encore parler, ou fin du tour d'enchères
function needs(t, s) { return canAct(s) && (!s.acted || s.bet < t.curBet); }
function setTurn(t, i, now, sec) {
  const lv = live(t);
  if (lv.length <= 1) return finishFold(t, now);
  const actors = t.seats.filter((s) => canAct(s));
  const maxBet = Math.max(...lv.map(([s]) => s.bet));
  const done = !actors.some((s) => needs(t, s));
  // un seul joueur peut encore miser et il a déjà égalé tout le monde : plus d'enchères possibles
  const alone = actors.length <= 1 && actors.every((s) => s.bet >= maxBet);
  if (done || alone) return nextStreet(t, now, sec);
  let j = i >= 0 && needs(t, t.seats[i]) ? i : nextIdx(t, i < 0 ? t.button : i, (s) => needs(t, s));
  t.toAct = j;
  t.deadline = now + (t.seats[j].out ? AWAY_TURN_MS : TURN_MS);
}

function nextStreet(t, now, sec) {
  // les mises du tour vont au pot
  t.seats.forEach((s) => { if (s) { s.bet = 0; s.acted = false; s.noRaise = false; } });
  t.curBet = 0; t.minRaise = t.bb; t.toAct = -1;
  const order = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' };
  const nx = order[t.stage];
  if (nx === 'showdown') return showdown(t, now, sec);
  const n = nx === 'flop' ? 3 : 1;
  sec.deck.pop(); // carte brûlée
  for (let k = 0; k < n; k++) t.board.push(sec.deck.pop());
  t.stage = nx;
  log(t, `${nx === 'flop' ? 'Flop' : nx === 'turn' ? 'Turn' : 'River'} : ${t.board.slice(nx === 'flop' ? 0 : -1).join(' ')}`);
  const actors = t.seats.filter((s) => canAct(s));
  if (actors.length <= 1) return nextStreet(t, now, sec); // tout le monde à tapis : on dévoile le reste
  setTurn(t, nextIdx(t, t.button, (s) => canAct(s)), now, sec);
}

// Tout le monde s'est couché sauf un joueur : il ramasse le pot sans montrer ses cartes
function finishFold(t, now) {
  const [[w, wi]] = live(t);
  updatePot(t);
  const won = t.pot;
  w.stack += won;
  t.seats.forEach((s) => { if (s) { s.bet = 0; } });
  t.result = { showdown: false, winners: [{ seat: wi, uid: w.uid, name: name(w), amount: won, hand: '' }] };
  log(t, `${name(w)} remporte ${fmtN(won)} JP`);
  endHand(t, now, END_MS);
}

// Pots (principal et annexes) : chaque palier de mise des joueurs encore en jeu
export function buildPots(t) {
  const inHand = t.seats.map((s, i) => [s, i]).filter(([s]) => s && s.in);
  const liveC = [...new Set(inHand.filter(([s]) => !s.folded).map(([s]) => s.contrib))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const L of liveC) {
    if (L <= prev) continue;
    const amount = inHand.reduce((a, [s]) => a + Math.max(0, Math.min(s.contrib, L) - prev), 0);
    const elig = inHand.filter(([s]) => !s.folded && s.contrib >= L).map(([, i]) => i);
    if (amount > 0) pots.push({ amount, elig });
    prev = L;
  }
  const extra = inHand.reduce((a, [s]) => a + Math.max(0, s.contrib - prev), 0) + (t.dead || 0);
  if (extra && pots.length) pots[pots.length - 1].amount += extra;
  return pots;
}

function showdown(t, now, sec) {
  t.stage = 'river';
  const lv = live(t);
  const ev = {};
  for (const [s, i] of lv) { const c = sec.cards[i] || []; s.shown = c; ev[i] = evaluate([...c, ...t.board]); }
  const pots = buildPots(t);
  const got = {};
  pots.forEach((p, pi) => {
    const best = Math.max(...p.elig.map((i) => ev[i].score));
    const ws = p.elig.filter((i) => ev[i].score === best);
    // ordre des gagnants à partir de la gauche du bouton (le jeton en trop va au premier)
    ws.sort((a, b) => ((a - t.button - 1 + t.seats.length) % t.seats.length) - ((b - t.button - 1 + t.seats.length) % t.seats.length));
    const part = Math.floor(p.amount / ws.length);
    let odd = p.amount - part * ws.length;
    ws.forEach((i) => { const a = part + (odd > 0 ? 1 : 0); if (odd > 0) odd--; t.seats[i].stack += a; got[i] = (got[i] || 0) + a; });
    if (pots.length > 1) log(t, `${pi ? `Pot annexe ${pi}` : 'Pot principal'} (${fmtN(p.amount)}) : ${ws.map((i) => name(t.seats[i])).join(', ')}`);
  });
  t.result = { showdown: true, winners: Object.keys(got).map((i) => ({ seat: +i, uid: t.seats[i].uid, name: name(t.seats[i]), amount: got[i], hand: ev[i].name })),
    hands: Object.fromEntries(lv.map(([, i]) => [i, ev[i].name])) };
  for (const w of t.result.winners) log(t, `${w.name} remporte ${fmtN(w.amount)} JP avec ${w.hand.charAt(0).toLowerCase() + w.hand.slice(1)}`);
  endHand(t, now, SHOWDOWN_MS);
}

function endHand(t, now, pause) {
  t.stage = 'end'; t.toAct = -1; t.deadline = 0; t.next = now + pause;
  t.seats.forEach((s) => { if (s) { s.bet = 0; if (s.in && s.stack <= 0 && !s.left) { s.bust = true; s.bustAt = now; s.last = 'Tapis perdu'; } } });
}

/* ------------------------------ actions ------------------------------ */
// Montants utiles pour l'interface : à suivre, relance minimum / maximum (en « mise totale » du tour)
export function options(t, i) {
  const s = t.seats[i];
  if (!s || t.toAct !== i || !BETTING.includes(t.stage)) return null;
  const toCall = Math.max(0, Math.min(t.curBet - s.bet, s.stack));
  const maxTo = s.bet + s.stack;
  const minTo = Math.min(maxTo, t.curBet ? t.curBet + t.minRaise : t.bb);
  return { toCall, canCheck: t.curBet <= s.bet, canRaise: !s.noRaise && maxTo > t.curBet, minTo, maxTo, pot: t.pot };
}

// a : 'fold' | 'check' | 'call' | 'raise' (to = mise totale du tour) | 'allin'. Renvoie un message d'erreur ou null.
export function act(t, sec, i, a, to, now) {
  const s = t.seats[i];
  if (!BETTING.includes(t.stage) || t.toAct !== i || !s) return 'Ce n\'est pas à toi de jouer';
  const o = options(t, i);
  const pay = (amt) => { amt = Math.max(0, Math.min(amt, s.stack)); s.stack -= amt; s.bet += amt; s.contrib += amt; if (!s.stack) s.allin = true; };
  if (a === 'allin') { if (o.maxTo > t.curBet && o.canRaise) { a = 'raise'; to = o.maxTo; } else a = 'call'; }
  if (a === 'call' && o.toCall === 0) a = 'check';
  if (a === 'fold') { s.folded = true; s.last = 'Se couche'; }
  else if (a === 'check') { if (!o.canCheck) return 'Impossible de checker : il faut suivre ou se coucher'; s.last = 'Check'; }
  else if (a === 'call') { pay(o.toCall); s.last = s.allin ? `Tapis ${fmtN(s.bet)}` : `Suit ${fmtN(o.toCall)}`; }
  else if (a === 'raise') {
    to = Math.floor(+to || 0);
    if (!o.canRaise) return 'Relance impossible';
    if (to > o.maxTo) to = o.maxTo;
    if (to < o.minTo && to < o.maxTo) return `Relance minimum : ${fmtN(o.minTo)}`;
    if (to <= t.curBet) return 'La relance doit dépasser la mise actuelle';
    const size = to - t.curBet, full = size >= t.minRaise, wasBet = t.curBet > 0;
    pay(to - s.bet);
    if (full) { t.minRaise = size; t.seats.forEach((x, k) => { if (x && k !== i && canAct(x)) { x.acted = false; x.noRaise = false; } }); }
    else t.seats.forEach((x, k) => { if (x && k !== i && canAct(x) && x.acted) { x.acted = false; x.noRaise = true; } }); // tapis trop court : pas de nouvelle relance pour ceux qui ont déjà parlé
    t.curBet = to;
    s.last = s.allin ? `Tapis ${fmtN(to)}` : wasBet ? `Relance à ${fmtN(to)}` : `Mise ${fmtN(to)}`;
  } else return 'Action inconnue';
  s.acted = true;
  log(t, `${name(s)} : ${s.last.toLowerCase()}`);
  updatePot(t);
  setTurn(t, nextIdx(t, i, (x) => needs(t, x)), now, sec);
  return null;
}

// Temps écoulé : check si possible, sinon on se couche. Deux fois de suite : le joueur passe absent.
export function timeout(t, sec, now) {
  if (!BETTING.includes(t.stage) || t.toAct < 0 || now < t.deadline) return false;
  const i = t.toAct, s = t.seats[i];
  if (!s.out) { s.to = (s.to || 0) + 1; if (s.to >= TIMEOUTS_TO_AWAY) { s.out = true; s.outAt = now; log(t, `${name(s)} est absent`); } }
  const o = options(t, i);
  act(t, sec, i, o && o.canCheck ? 'check' : 'fold', 0, now);
  return true;
}

// Retire un joueur de la table : son tapis lui revient (les jetons déjà misés restent dans le pot). Renvoie le tapis rendu.
export function leave(t, sec, i, now) {
  const s = t.seats[i];
  if (!s) return 0;
  const back = s.stack;
  s.stack = 0;
  log(t, `${name(s)} quitte la table`);
  if (s.in && !s.folded && BETTING.includes(t.stage)) {
    s.left = true; s.out = true;
    if (t.toAct === i) { s.folded = true; s.acted = true; s.last = 'Se couche'; updatePot(t); setTurn(t, nextIdx(t, i, (x) => needs(t, x)), now, sec); }
    else { s.folded = true; s.last = 'Se couche'; if (live(t).length <= 1) finishFold(t, now); }
  } else if (s.in && BETTING.includes(t.stage)) { s.left = true; } // déjà couché : sa mise reste dans le pot, la place se libère à la fin de la main
  else t.seats[i] = null;
  return back;
}

// Entretien : temps écoulés, nouvelle main, absents et tapis vides retirés. Renvoie { changed, removed: [{ uid, refund }], priv }
export function tick(t, sec, now, rand) {
  const out = { changed: false, removed: [], priv: null };
  if (BETTING.includes(t.stage)) {
    // un joueur absent passe la main tout de suite
    while (BETTING.includes(t.stage) && t.toAct >= 0 && now >= t.deadline) { timeout(t, sec, now); out.changed = true; }
    return out;
  }
  if (t.stage === 'end' && now < t.next) return out;
  // entre deux mains : on libère les places des absents de longue date et des tapis vides
  t.seats.forEach((s, i) => {
    if (!s) return;
    if (s.left) { t.seats[i] = null; out.changed = true; return; }
    if (s.bust && now - (s.bustAt || now) > BUST_KICK_MS) { out.removed.push({ uid: s.uid, refund: 0 }); log(t, `${name(s)} libère sa place`); t.seats[i] = null; out.changed = true; return; }
    if (s.out && now - (s.outAt || now) > AWAY_KICK_MS) { out.removed.push({ uid: s.uid, refund: s.stack }); log(t, `${name(s)} est retiré de la table (absent)`); t.seats[i] = null; out.changed = true; }
  });
  if (t.stage === 'idle') {
    // table au repos : compte à rebours dès que 2 joueurs peuvent jouer
    const ready = t.seats.filter((s) => dealable(s)).length >= 2;
    if (!ready) { if (t.next) { t.next = 0; out.changed = true; } return out; }
    if (!t.next) { t.next = now + START_MS; out.changed = true; return out; }
    if (now < t.next) return out;
  }
  if (t.stage === 'end' || t.stage === 'idle') {
    const before = t.stage, h = t.hand;
    const priv = startHand(t, sec, now, rand);
    if (priv) { out.priv = priv; out.changed = true; }
    else if (before === 'end') { out.changed = true; } // retour au repos
    else if (h !== t.hand) out.changed = true;
  }
  return out;
}

// Recave après avoir tout perdu (ou pour revenir à la cave de départ si le tapis est plus petit)
export function rebuy(t, i, now) {
  const s = t.seats[i];
  if (!s) return 'Tu n\'es pas assis à cette table';
  if (s.in && BETTING.includes(t.stage) && !s.folded) return 'Attends la fin de la main';
  if (s.stack > 0) return 'Tu as encore des jetons';
  s.stack = t.buyIn; s.bust = false; s.bustAt = 0; s.out = false; s.to = 0; s.last = 'Recave';
  log(t, `${name(s)} se recave (${fmtN(t.buyIn)} JP)`);
  return null;
}
export function setAway(t, i, away, now) {
  const s = t.seats[i];
  if (!s) return 'Tu n\'es pas assis à cette table';
  s.out = !!away; s.outAt = away ? now : 0; s.to = 0;
  log(t, away ? `${name(s)} s'absente` : `${name(s)} est de retour`);
  return null;
}
