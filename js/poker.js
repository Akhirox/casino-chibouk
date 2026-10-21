// Poker Texas Hold'em entre joueurs, avec des Jetons Poker (JP). Salon (5 tables toujours ouvertes) puis table.
// Le serveur (Cloud Functions) distribue et arbitre : la page ne fait qu'afficher et envoyer tes décisions.
import * as E from './poker/engine.js';
import { ROOMS, roomCfg } from './poker/server.js';
import { jpState, onJP, jpHTML, earnWheel } from './jp.js';
import { getPlayers } from './players.js';
import { avatarHTML } from './profile.js';
import { icon, monkeySVG } from './art.js';
import { $, $$, esc, fmt, toast, modal, coinRain } from './ui.js';
import { sfx } from './sfx.js';
import { parisDate } from './wallet.js';

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const cardHTML = (c, cls = '') => (c ? `<span class="pk-card ${'hd'.includes(c[1]) ? 'red' : ''} ${cls}"><b>${c[0] === 'T' ? '10' : c[0]}</b><i>${SUIT[c[1]]}</i></span>` : `<span class="pk-card back ${cls}"></span>`);
const n = (x) => fmt(Math.floor(x || 0));

export function mount(view, { wallet, backend }) {
  let alive = true, mode = 'lobby', room = null, table = null, hand = null, lobby = {}, offset = 0;
  let raiseKey = '', raiseVal = 0; // montant de relance en cours de réglage (gardé si l'écran se redessine)
  let offTable = null, offHand = null, offLobby = null, busy = false, lastTick = 0, lastBoard = 0, lastTurnKey = '', lastHandSeen = 0, lastResultKey = '';
  const players = new Map();
  const offJP = onJP(() => { if (!alive) return; if (mode === 'lobby') renderLobby(); else renderTable(); });
  getPlayers(backend, wallet).then((rows) => { rows.forEach((r) => players.set(r.uid, r)); if (alive && mode === 'table') renderTable(); }).catch(() => {});

  if (!backend.pokerCall) { view.innerHTML = '<div class="pk-wrap"><p class="muted">Le poker n\'est pas disponible.</p></div>'; return () => {}; }
  const call = async (op, data = {}, r = room) => {
    if (busy && op !== 'tick') return { ok: false };
    if (op !== 'tick') busy = true;
    try {
      const res = await backend.pokerCall(op, r, data);
      if (!res || !res.ok) { if (op !== 'tick' && res && res.error) toast(esc(res.error), 'error'); }
      return res || { ok: false };
    } finally { if (op !== 'tick') busy = false; }
  };

  /* ------------------------------ salon ------------------------------ */
  function openLobby() {
    mode = 'lobby'; room = null; table = null; hand = null;
    offTable && offTable(); offHand && offHand(); offTable = offHand = null;
    if (!offLobby) offLobby = backend.watchPokerLobby((o) => { lobby = o || {}; if (alive && mode === 'lobby') renderLobby(); });
    renderLobby();
  }
  function renderLobby() {
    const jp = jpState(), mine = jp.room;
    const today = parisDate();
    const wheelLeft = jp.loaded && jp.wheelDay !== today && !wallet.dailyAvailable(); // roue déjà tournée avant les JP : on peut quand même réclamer
    view.innerHTML = `<div class="pk-wrap">
      <div class="game-head"><h1>Poker <span>Hold'em</span></h1><div class="actions">${jpHTML(jp.jp, 'big')}<button class="btn btn-ghost btn-sm" data-rules>${icon('scroll')}Règles</button></div></div>
      <div class="pk-intro">${monkeySVG({ cls: 'pk-intro-monkey', wink: true })}<div>
        <b>Ici, tout le monde joue avec la même monnaie : les Jetons Poker (JP).</b>
        <p class="muted">Ils ne s'achètent pas et aucun bonus ne les multiplie : <b>50 à 200 JP</b> chaque jour avec la roue du jour, et <b>10 JP</b> par mini-jeu terminé (un toutes les 30 s au plus). Assieds-toi à une table en payant sa cave ; quand tu la quittes, ton tapis revient en JP.</p>
        ${wheelLeft ? '<button class="btn btn-gold btn-sm" data-wheeljp>Récupérer les JP de la roue du jour</button>' : ''}</div></div>
      <div class="pk-rooms">${ROOMS.map((r) => {
        const t = lobby[r.id], seated = t ? t.seats.filter(Boolean) : [], here = mine === r.id;
        const full = seated.length >= r.max;
        return `<div class="pk-room ${here ? 'mine' : ''}">
          <div class="pk-room-h"><b>${esc(r.name)}</b><span class="pk-stakes">Blindes ${n(r.sb)} / ${n(r.bb)}</span></div>
          <div class="pk-room-buy">Cave ${jpHTML(r.buyIn)}</div>
          <div class="pk-room-seats">${Array.from({ length: r.max }, (_, k) => `<i class="${k < seated.length ? 'on' : ''}"></i>`).join('')}<span>${seated.length} / ${r.max} joueurs${t && t.stage && E.BETTING.includes(t.stage) ? ' · main en cours' : ''}</span></div>
          <div class="pk-room-names muted">${seated.map((s) => esc(s.name)).join(', ') || 'Table libre'}</div>
          <div class="pk-room-btns">${here ? '<button class="btn btn-gold" data-open="' + r.id + '">Retourner à ta table</button>'
            : `<button class="btn btn-gold" data-join="${r.id}" ${full || mine || jp.jp < r.buyIn ? 'disabled' : ''}>${full ? 'Complète' : `S'asseoir · ${n(r.buyIn)} JP`}</button><button class="btn btn-ghost" data-open="${r.id}">Regarder</button>`}</div>
          ${!here && !mine && !full && jp.loaded && jp.jp < r.buyIn ? `<small class="muted">Il te manque ${n(r.buyIn - jp.jp)} JP</small>` : ''}
        </div>`;
      }).join('')}</div>
      ${mine ? `<p class="muted pk-note">Tu es assis à la ${esc((roomCfg(mine) || {}).name || mine)}. Une seule table à la fois.</p>` : ''}
    </div>`;
    $$('[data-join]', view).forEach((b) => (b.onclick = () => join(b.dataset.join)));
    $$('[data-open]', view).forEach((b) => (b.onclick = () => openTable(b.dataset.open)));
    $('[data-rules]', view).onclick = rules;
    const wj = $('[data-wheeljp]', view);
    if (wj) wj.onclick = async () => { wj.disabled = true; const a = await earnWheel(); if (a) { toast(`Roue du jour : +${n(a)} JP`, 'win'); sfx.coin(); } else wj.disabled = false; };
  }
  async function join(id) {
    const cfg = roomCfg(id);
    const ok = await modal({ title: `S'asseoir à la ${esc(cfg.name)} ?`, html: `<p>La cave de <b>${n(cfg.buyIn)} JP</b> est prise sur ton solde et devient ton tapis. Blindes ${n(cfg.sb)} / ${n(cfg.bb)}.</p><p class="muted">Quand tu quittes la table, ce qu'il te reste revient en JP. Si tu perds tout, tu peux te recaver sans te lever.</p>`,
      buttons: [{ label: 'Annuler', value: false }, { label: `S'asseoir (${n(cfg.buyIn)} JP)`, value: true, primary: true }] });
    if (!ok || !alive) return;
    const r = await call('join', {}, id);
    if (r.ok) { sfx.chip(); openTable(id); }
  }

  /* ------------------------------ table ------------------------------ */
  function openTable(id) {
    mode = 'table'; room = id; table = null; hand = null; lastBoard = 0; lastHandSeen = 0;
    offLobby && offLobby(); offLobby = null;
    offTable && offTable(); offHand && offHand();
    offTable = backend.watchPokerTable(id, (t) => {
      if (!alive || room !== id) return;
      table = t || null;
      if (t && t.at) { const o = t.at - Date.now(); if (Math.abs(o) < 3600000) offset = o; }
      renderTable();
    });
    offHand = backend.watchPokerHand(id, wallet.uid, (h) => { if (!alive || room !== id) return; hand = h; renderTable(); });
    renderTable();
  }
  const sNow = () => Date.now() + offset;
  const meIdx = () => (table ? E.seatOf(table, wallet.uid) : -1);

  function seatHTML(t, i, pos, me) {
    const s = t.seats[i];
    if (!s) return `<div class="pk-seat empty p${pos}"><div class="pk-plate"><span class="muted">Place libre</span></div></div>`;
    const p = players.get(s.uid) || { pseudo: s.name, uid: s.uid };
    const mine = i === me, end = t.stage === 'end';
    const win = end && t.result && t.result.winners.some((w) => w.seat === i);
    let cards = '';
    if (s.in && !mine) { // tes cartes sont affichées en grand sous la table
      if (s.shown) cards = s.shown.map((c) => cardHTML(c, 'sm')).join('');
      else if (!s.folded) cards = cardHTML(null, 'sm') + cardHTML(null, 'sm');
    }
    const acting = t.toAct === i && E.BETTING.includes(t.stage);
    const pct = acting ? Math.max(0, Math.min(100, ((t.deadline - sNow()) / (s.out ? E.AWAY_TURN_MS : E.TURN_MS)) * 100)) : 0;
    const handName = end && t.result && t.result.hands && t.result.hands[i];
    return `<div class="pk-seat p${pos} ${acting ? 'acting' : ''} ${s.folded ? 'folded' : ''} ${s.out ? 'away' : ''} ${s.bust ? 'bust' : ''} ${mine ? 'me' : ''} ${win ? 'win' : ''}">
      <div class="pk-hole">${cards}</div>
      <div class="pk-plate">${avatarHTML(p, 'av-sm')}<div class="pk-pl-txt"><b>${esc(s.name)}</b><span class="pk-stack">${n(s.stack)}</span></div>
        ${acting ? `<div class="pk-timer"><i style="width:${pct}%"></i></div>` : ''}</div>
      <small class="pk-last">${handName ? esc(handName) : s.bust ? 'Tapis perdu' : s.out ? 'Absent' : !s.in && E.BETTING.includes(t.stage) ? 'Prochaine main' : esc(s.last || '')}</small>
      ${s.bet ? `<div class="pk-bet"><i class="pk-chip"></i>${n(s.bet)}</div>` : ''}
      ${t.button === i && t.stage !== 'idle' ? '<span class="pk-dealer">D</span>' : ''}
    </div>`;
  }

  function renderTable() {
    if (mode !== 'table') return;
    const cfg = roomCfg(room), jp = jpState();
    const t = table || { ...cfg, seats: Array(cfg.max).fill(null), stage: 'idle', board: [], pot: 0, log: [], hand: 0 };
    const me = meIdx(), s = me >= 0 ? t.seats[me] : null;
    const base = me >= 0 ? me : 0;
    const seats = t.seats.map((_, i) => seatHTML(t, i, (i - base + t.seats.length) % t.seats.length, me)).join('');
    const board = Array.from({ length: 5 }, (_, k) => (t.board[k] ? cardHTML(t.board[k], k >= lastBoard ? 'deal' : '') : '<span class="pk-card slot"></span>')).join('');
    const end = t.stage === 'end' && t.result;
    const msg = end ? t.result.winners.map((w) => `<b>${esc(w.name)}</b> remporte ${n(w.amount)} JP${w.hand ? ` avec ${esc(w.hand.charAt(0).toLowerCase() + w.hand.slice(1))}` : ''}`).join('<br>')
      : t.stage === 'idle' ? (t.next ? `La partie commence dans ${Math.max(1, Math.ceil((t.next - sNow()) / 1000))} s…` : 'En attente d\'un autre joueur…') : '';
    // ma meilleure main du moment
    const myCards = s && s.in && hand && hand.hand === t.hand ? hand.cards : null;
    const myHand = myCards && t.board.length >= 3 ? E.evaluate([...myCards, ...t.board]).name : myCards && myCards[0][0] === myCards[1][0] ? E.evaluate(myCards).name : '';
    const free = t.seats.some((x) => !x);
    view.innerHTML = `<div class="pk-wrap table">
      <div class="pk-bar">
        <button class="btn btn-ghost btn-sm" data-lobby>← Salon</button>
        <div class="pk-bar-t"><b>${esc(cfg.name)}</b><small class="muted">Blindes ${n(cfg.sb)} / ${n(cfg.bb)} · cave ${n(cfg.buyIn)} JP${t.hand ? ` · main n° ${t.hand}` : ''}</small></div>
        <div class="pk-bar-r">${jpHTML(jp.jp)}
          ${s ? `${s.out && !s.bust ? '<button class="btn btn-gold btn-sm" data-back>Je reviens</button>' : !s.bust ? '<button class="btn btn-ghost btn-sm" data-away>S\'absenter</button>' : ''}<button class="btn btn-ghost btn-sm" data-leave>Quitter la table</button>`
            : free && !jp.room ? `<button class="btn btn-gold btn-sm" data-sit ${jp.jp < cfg.buyIn ? 'disabled' : ''}>S'asseoir · ${n(cfg.buyIn)} JP</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-rules title="Règles">?</button></div>
      </div>
      <div class="pk-felt-wrap"><div class="pk-felt">
        <div class="pk-center"><div class="pk-board">${board}</div>
          <div class="pk-pot">${t.pot ? `Pot : <b>${n(t.pot)}</b>` : ''}</div>
          <div class="pk-msg ${end ? 'res' : ''}">${msg}</div></div>
        ${seats}
      </div></div>
      ${myCards ? `<div class="pk-mine ${s.folded ? 'folded' : ''}">${myCards.map((c) => cardHTML(c, 'lg')).join('')}${myHand && !s.folded ? `<span class="pk-myhand">${esc(myHand)}</span>` : s.folded ? '<span class="pk-myhand">Couché</span>' : ''}</div>` : ''}
      <div class="pk-actions" id="pk-actions"></div>
      ${s && s.bust ? `<div class="pk-bust"><b>Tu n'as plus de jetons.</b> <button class="btn btn-gold" data-rebuy ${jp.jp < cfg.buyIn ? 'disabled' : ''}>Se recaver · ${n(cfg.buyIn)} JP</button>${jp.jp < cfg.buyIn ? `<small class="muted">Il te manque ${n(cfg.buyIn - jp.jp)} JP</small>` : '<small class="muted">Sans recave, ta place se libère au bout de 3 minutes.</small>'}</div>` : ''}
      ${s && s.out && !s.bust ? '<p class="pk-note">Tu es absent : tu ne reçois plus de cartes. Au bout de 10 minutes, tu quittes la table et ton tapis revient en JP.</p>' : ''}
      <details class="pk-log"><summary>Historique de la table</summary><ol>${(t.log || []).slice().reverse().map((l) => `<li>${esc(l)}</li>`).join('')}</ol></details>
    </div>`;
    bindTable(t, me);
    renderActions(t, me);
    // sons et petites animations
    if (t.board.length > lastBoard && lastBoard >= 0) sfx.card();
    lastBoard = t.board.length;
    const turnKey = `${t.hand}:${t.stage}:${t.toAct}:${t.curBet}`;
    if (me >= 0 && t.toAct === me && E.BETTING.includes(t.stage) && turnKey !== lastTurnKey) sfx.tick();
    lastTurnKey = turnKey;
    const rk = end ? `${t.hand}` : '';
    if (rk && rk !== lastResultKey) { lastResultKey = rk; if (t.result.winners.some((w) => w.uid === wallet.uid)) { sfx.win(t.result.winners.find((w) => w.uid === wallet.uid).amount >= 10 * cfg.bb); coinRain(15); } }
    if (t.hand !== lastHandSeen) { lastHandSeen = t.hand; lastBoard = t.board.length; }
  }

  function bindTable(t, me) {
    $('[data-lobby]', view).onclick = openLobby;
    $$('[data-rules]', view).forEach((b) => (b.onclick = rules));
    const on = (sel, fn) => { const b = $(sel, view); if (b) b.onclick = fn; };
    on('[data-sit]', () => join(room));
    on('[data-away]', () => call('away'));
    on('[data-back]', () => call('back'));
    on('[data-rebuy]', async () => { const r = await call('rebuy'); if (r.ok) sfx.chip(); });
    on('[data-leave]', async () => {
      const s = t.seats[me], inHand = s && s.in && !s.folded && E.BETTING.includes(t.stage);
      const ok = await modal({ title: 'Quitter la table ?', html: `<p>Ton tapis de <b>${n(s ? s.stack : 0)} JP</b> revient sur ton solde.${inHand ? ' Tu te couches pour cette main : ce que tu as déjà misé reste dans le pot.' : ''}</p>`,
        buttons: [{ label: 'Rester', value: false }, { label: 'Quitter la table', value: true, primary: true }] });
      if (!ok || !alive) return;
      const r = await call('leave');
      if (r.ok) { toast('Tu as quitté la table, ton tapis est revenu en JP.'); openLobby(); }
    });
  }

  function renderActions(t, me) {
    const box = $('#pk-actions', view);
    const o = me >= 0 ? E.options(t, me) : null;
    if (!o) { box.innerHTML = ''; return; }
    const potAfter = t.pot + o.toCall;
    const preset = (f) => Math.max(o.minTo, Math.min(o.maxTo, t.curBet + Math.round(f * potAfter)));
    const verb = t.curBet > 0 ? 'Relancer à' : 'Miser';
    box.innerHTML = `<div class="pk-act">
      <button class="btn btn-ghost pk-fold" data-a="fold">Se coucher <kbd>F</kbd></button>
      <button class="btn btn-blue" data-a="${o.canCheck ? 'check' : 'call'}">${o.canCheck ? 'Parole' : `Suivre ${n(o.toCall)}`}${o.toCall >= t.seats[me].stack && !o.canCheck ? ' (tapis)' : ''} <kbd>C</kbd></button>
      ${o.canRaise ? `<div class="pk-raise">
        <div class="pk-presets">${o.minTo < o.maxTo ? `<button data-p="${o.minTo}">Min</button><button data-p="${preset(0.5)}">½ pot</button><button data-p="${preset(0.75)}">¾ pot</button><button data-p="${preset(1)}">Pot</button>` : ''}<button data-p="${o.maxTo}">Tapis</button></div>
        <div class="pk-raise-row"><input type="range" id="pk-range" min="${o.minTo}" max="${o.maxTo}" step="1" value="${o.minTo}"><input type="number" class="bet-input" id="pk-to" min="${o.minTo}" max="${o.maxTo}" value="${o.minTo}">
        <button class="btn btn-gold" data-a="raise"><span id="pk-verb">${o.minTo >= o.maxTo ? 'Tapis' : verb}</span> <b id="pk-tov">${n(o.minTo)}</b> <kbd>R</kbd></button></div></div>` : ''}
    </div>`;
    const rng = $('#pk-range', box), inp = $('#pk-to', box);
    const key = `${t.hand}:${t.stage}:${t.curBet}`;
    const setTo = (v) => { v = Math.max(o.minTo, Math.min(o.maxTo, Math.floor(+v || 0))); raiseKey = key; raiseVal = v; if (rng) rng.value = v; if (inp) inp.value = v; const tv = $('#pk-tov', box); if (tv) tv.textContent = n(v); const vb = $('#pk-verb', box); if (vb) vb.textContent = v >= o.maxTo ? 'Tapis' : verb; };
    if (rng) { rng.oninput = () => setTo(rng.value); inp.oninput = () => setTo(inp.value); if (raiseKey === key && raiseVal) setTo(raiseVal); }
    $$('[data-p]', box).forEach((b) => (b.onclick = () => { setTo(b.dataset.p); sfx.click(); }));
    $$('[data-a]', box).forEach((b) => (b.onclick = () => act(b.dataset.a, inp ? +inp.value : 0)));
  }
  async function act(a, to) {
    if (!table) return;
    $$('#pk-actions button', view).forEach((b) => (b.disabled = true));
    const r = await call('act', { hand: table.hand, a, to });
    if (r.ok) a === 'fold' ? sfx.flip() : sfx.chip();
    else renderTable();
  }

  // Le serveur n'a pas d'horloge : quand un temps de jeu ou la pause entre deux mains est écoulé, les pages ouvertes le préviennent
  const driver = setInterval(() => {
    if (!alive || mode !== 'table' || !table) return;
    // barre de temps fluide
    const tb = view.querySelector('.pk-seat.acting .pk-timer i');
    if (tb && table.toAct >= 0) { const s = table.seats[table.toAct]; tb.style.width = Math.max(0, Math.min(100, ((table.deadline - sNow()) / (s && s.out ? E.AWAY_TURN_MS : E.TURN_MS)) * 100)) + '%'; }
    const me = meIdx(), jitter = (me >= 0 ? me : 6) * 250;
    const due = (E.BETTING.includes(table.stage) && table.toAct >= 0 && sNow() > table.deadline + 500 + jitter)
      || ((table.stage === 'end' || (table.stage === 'idle' && table.next)) && sNow() > table.next + 300 + jitter);
    if (due && Date.now() - lastTick > 2500) { lastTick = Date.now(); call('tick'); }
  }, 250);

  const onKey = (e) => {
    if (mode !== 'table' || e.target.closest('input,textarea') || document.querySelector('.modal-backdrop')) return;
    const k = e.key.toLowerCase(), box = $('#pk-actions', view);
    if (!box || !box.innerHTML) return;
    const b = k === 'f' ? $('[data-a="fold"]', box) : k === 'c' ? $('[data-a="check"], [data-a="call"]', box) : k === 'r' ? $('[data-a="raise"]', box) : null;
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  };
  document.addEventListener('keydown', onKey);

  function rules() {
    modal({ title: 'Poker Texas Hold\'em', cls: 'wide', html: `<ul class="muted fm-help">
      <li>Chacun reçoit <b>2 cartes cachées</b>, puis 5 cartes communes arrivent au milieu : le <b>flop</b> (3), la <b>turn</b> (1) et la <b>river</b> (1). Il y a un tour d'enchères avant le flop et après chaque arrivée de cartes.</li>
      <li>À ton tour : <b>se coucher</b>, <b>parole</b> (si personne n'a misé), <b>suivre</b>, ou <b>miser / relancer</b> (au moins la dernière relance, sans limite au-dessus : No Limit).</li>
      <li>La meilleure main de 5 cartes parmi tes 2 cartes et les 5 du milieu gagne le pot. Du plus fort au plus faible : quinte flush, carré, full, couleur, quinte, brelan, double paire, paire, carte haute.</li>
      <li>Les blindes tournent à chaque main avec le bouton <b>D</b>. Un joueur à tapis ne peut gagner que ce qu'il a pu couvrir (pots annexes).</li>
      <li><b>${E.TURN_MS / 1000} secondes</b> pour jouer. Temps écoulé : parole si possible, sinon tu te couches. Deux fois de suite : tu passes <b>absent</b> (plus de cartes). Absent plus de 10 minutes : tu quittes la table et ton tapis revient en JP.</li>
      <li>Tu peux quitter la table quand tu veux : ton tapis revient en JP. Si tu perds tout, tu peux te recaver sans te lever (ta place est gardée 3 minutes).</li>
      <li>Une seule table à la fois. Pas de commission : tout ce qui est misé revient aux joueurs.</li>
      <li>Les cartes sont mélangées et distribuées par le serveur : personne ne peut voir les cartes des autres.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  }

  // à l'ouverture : directement à ta table si tu es assis
  const st = jpState();
  if (st.room && roomCfg(st.room)) openTable(st.room); else openLobby();
  let first = !st.loaded;
  const offFirst = onJP((j) => { if (first && alive && j.loaded) { first = false; if (j.room && roomCfg(j.room) && mode === 'lobby') openTable(j.room); } });
  return () => { alive = false; clearInterval(driver); document.removeEventListener('keydown', onKey); offJP(); offFirst(); offTable && offTable(); offHand && offHand(); offLobby && offLobby(); };
}
