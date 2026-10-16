// Fil d'activité « En direct de la jungle » + jackpot commun de la slot.
// Lectures économes : toutes les 90 s, on ne lit que les nouveaux messages (1 lecture s'il n'y a rien) + le jackpot (1 lecture).
import { CONFIG } from './config.js';
import { randInt } from './games/slots-math.js';
import { ACHIEVEMENTS, TIERS } from './achievements.js';
import { vipOf } from './progress.js';
import { ITEMS } from './shop.js';
import { esc, fmt, money, toast, modal, coinRain } from './ui.js';
import { goldMonkeySVG } from './art.js';
import { sfx } from './sfx.js';

const GAME_NAMES = { slots: 'la Chibouk Slot', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue du Singe', limbo: 'au Limbo', scratch: 'aux jeux à gratter' };
const AT = (g) => (g === 'slots' ? 'à la Chibouk Slot' : GAME_NAMES[g] || '');
const mx = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

const QUIZ_LABEL = { quiz: 'au calcul mental', capitals: 'au quiz capitales', movies: 'au quiz ciné', flags: 'au quiz drapeaux', higher: 'au Plus ou moins' };
const QUIZ_ROUTE = { quiz: 'quiz', capitals: 'capitals', movies: 'movies', flags: 'flags', higher: 'higher' };
// Jeux de réflexion : exploits publiés avec un texte (« a résolu un » + lien vers le jeu + « difficile en 5 min »)
const BIG_MIN = { plinko: 100 };
export const FEAT_GAMES = { queens: 'Queens', tango: 'Tango', pinpoint: 'Pinpoint', sudoku: 'Sudoku', demineur: 'Démineur', snake: 'Snake', memory: 'Memory', crossword: 'mots croisés' };
// Qui est le sujet du message (pour la semaine : le vainqueur, pas celui qui a publié)
export const feedWho = (e) => (e.kind === 'week' && e.winner ? e.winner : e.pseudo);
// Texte d'un message du fil (le pseudo est ajouté à l'affichage)
export function feedText(e) {
  switch (e.kind) {
    case 'bigwin': return `a gagné ${fmt(e.amount)} Brundles (${mx(e.mult)}) ${AT(e.game)}`;
    case 'ach': return `a débloqué le succès « ${e.name} » (${e.tier})`;
    case 'jackpot': return `a remporté le JACKPOT : ${fmt(e.amount)} Brundles !`;
    case 'vip': return `est passé au rang VIP ${e.rank}${e.bonus ? ` (+${fmt(e.bonus)} Brundles)` : ''}`;
    case 'motus': return `a trouvé le mot du jour en ${e.tries} essai${e.tries > 1 ? 's' : ''}`;
    case 'shop': return `s'est offert « ${e.name} » à la boutique`;
    case 'week': return `remporte le classement de la semaine (${e.profit >= 0 ? '+' : ''}${fmt(e.profit)} Brundles)`;
    case 'quests': return 'a terminé ses 3 quêtes du jour';
    case 'achs': return `a débloqué ${e.names.length} succès : ${e.names.map((n) => `« ${n} »`).join(', ')}`;
    case 'fs': return `a déclenché ${e.spins} tours gratuits à la Chibouk Slot (${e.scatters} SCATTER)`;
    case 'perfect': return `a fait un sans-faute ${QUIZ_LABEL[e.game] || ''}${e.mode ? ` (${e.mode})` : ''}`;
    case 'wheel': return `a gagné ${fmt(e.amount)} Brundles à la roue du jour${e.streak > 1 ? ` (série de ${e.streak} jours)` : ''}`;
    case 'streak': return `a gagné ${fmt(e.amount)} Brundles au Plus ou moins avec une série de ${e.n}`;
    case 'replant': return `a replanté sa ferme et gagne ${e.gain} graine${e.gain > 1 ? 's' : ''} d'or (${e.seeds} au total)`;
    case 'farm': return `a une ferme qui produit plus de ${fmt(e.n)} bananes par heure`;
    case 'feat': return `${e.txt || ''} ${FEAT_GAMES[e.game] || ''}${e.tail ? ' ' + e.tail : ''}`;
    default: return e.text || '';
  }
}
// Version enrichie (liens vers le jeu, survol des succès, fiche du joueur)
const GAME_ROUTE = { slots: 'slots', blackjack: 'blackjack', roulette: 'roulette', plinko: 'plinko', crash: 'crash', tower: 'tower', mines: 'mines', dice: 'dice', hilo: 'hilo', keno: 'keno', wheel: 'wheel', limbo: 'limbo', scratch: 'scratch' };
function achLink(id, name) {
  const a = ACHIEVEMENTS.find((x) => x.id === id) || ACHIEVEMENTS.find((x) => x.name === name);
  const tk = a ? a.tier : 'gold';
  return `<a class="fd-link fd-ach" href="#/achievements">« ${esc(a ? a.name : name)} »${a ? `<span class="hover-card"><span class="tier-badge t-${tk}">${TIERS[tk].name} · +${fmt(TIERS[tk].reward)}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>` : ''}</a>`;
}
export function feedRich(e) {
  const who = e.kind === 'week' && e.winner ? `<b>${esc(e.winner)}</b>` : `<button type="button" class="pl-link fd-who" data-player="${esc(e.uid)}">${esc(e.pseudo)}</button>`;
  const L = (href, txt) => `<a class="fd-link" href="${href}">${txt}</a>`;
  let t;
  switch (e.kind) {
    case 'bigwin': t = `a gagné <b class="gold">${fmt(e.amount)}</b> Brundles (${mx(e.mult)}) ${GAME_ROUTE[e.game] ? L('#/' + e.game, esc(AT(e.game))) : ''}`; break;
    case 'ach': {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id) || ACHIEVEMENTS.find((x) => x.name === e.name);
      t = `a débloqué le succès ${achLink(e.id, e.name)} <span class="tier-badge t-${a ? a.tier : 'gold'}">${esc(e.tier)}</span>`;
      break;
    }
    case 'jackpot': t = `a remporté le ${L('#/slots', 'JACKPOT')} : <b class="gold">${fmt(e.amount)}</b> Brundles !`; break;
    case 'vip': t = `est passé au rang VIP <button type="button" class="fd-link" data-vip>${esc(e.rank)}</button>${e.bonus ? ` et touche <b class="gold">${fmt(e.bonus)}</b> Brundles de bonus` : ''}`; break;
    case 'motus': t = `a trouvé le ${L('#/motus', 'mot du jour')} en ${e.tries} essai${e.tries > 1 ? 's' : ''}`; break;
    case 'shop': t = `s'est offert « ${esc(e.name)} » à la ${L('#/shop', 'boutique')}`; break;
    case 'week': t = `remporte le ${L('#/ranking', 'classement de la semaine')} (${e.profit >= 0 ? '+' : ''}${fmt(e.profit)} Brundles)`; break;
    case 'quests': t = `a terminé ses 3 ${L('#/lobby', 'quêtes du jour')}`; break;
    case 'achs': t = `a débloqué ${(e.ids || []).length} succès : ${(e.ids || []).map((id, i) => achLink(id, (e.names || [])[i])).join(', ')}`; break;
    case 'fs': t = `a déclenché <b class="gold">${e.spins} tours gratuits</b> à la ${L('#/slots', 'Chibouk Slot')} (${e.scatters} SCATTER)`; break;
    case 'perfect': t = `a fait un <b class="gold">sans-faute</b> ${QUIZ_ROUTE[e.game] ? L('#/' + QUIZ_ROUTE[e.game], esc(QUIZ_LABEL[e.game])) : ''}${e.mode ? ` (${esc(e.mode)})` : ''}`; break;
    case 'wheel': t = `a gagné <b class="gold">${fmt(e.amount)}</b> Brundles à la roue du jour${e.streak > 1 ? ` (série de ${e.streak} jours)` : ''}`; break;
    case 'replant': t = `a replanté sa ${L('#/farm', 'ferme')} et gagne <b class="gold">${e.gain} graine${e.gain > 1 ? 's' : ''} d'or</b> (${e.seeds} au total)`; break;
    case 'farm': t = `a une ${L('#/farm', 'ferme')} qui produit plus de <b class="gold">${fmt(e.n)}</b> bananes par heure`; break;
    case 'feat': t = `${esc(e.txt || '')} ${FEAT_GAMES[e.game] ? L('#/' + e.game, FEAT_GAMES[e.game]) : ''}${e.tail ? ' ' + esc(e.tail) : ''}`; break;
    default: t = esc(feedText(e));
  }
  return `${who} ${t}`;
}
// Regroupe les messages semblables d'un même joueur (même type, même jeu, à moins de 6 h d'écart) pour éviter
// qu'un joueur qui enchaîne les parties remplisse tout le fil. Les succès d'un joueur sont fusionnés en une ligne.
const groupKey = (e) => {
  if (e.kind === 'week') return null;
  const k = e.kind === 'achs' ? 'ach' : e.kind === 'replant' ? 'farm' : e.kind;
  return `${e.uid}|${k}|${e.game || ''}`;
};
export function groupFeed(list, windowMs = 6 * 3600000) {
  const out = [], open = new Map();
  for (const e of list) { // du plus récent au plus ancien
    const k = groupKey(e);
    const g = k && open.get(k);
    if (g && g.items[g.items.length - 1].at - e.at <= windowMs) { g.items.push(e); continue; }
    const ng = { key: k ? `${k}|${e.at}` : String(e.id || e.at), items: [e] };
    if (k) open.set(k, ng);
    out.push(ng);
  }
  return out;
}
// Ligne affichée pour un groupe : le message le plus récent (ou le plus gros gain), les succès fusionnés
export function groupRich(g) {
  const items = g.items, e = items[0];
  if (items.length === 1) return feedRich(e);
  if (e.kind === 'ach' || e.kind === 'achs') {
    const ids = [], names = [];
    for (const x of items) {
      if (x.kind === 'achs') { (x.ids || []).forEach((id, i) => { ids.push(id); names.push((x.names || [])[i]); }); }
      else { ids.push(x.id); names.push(x.name); }
    }
    return feedRich({ ...e, kind: 'achs', ids, names });
  }
  if (e.kind === 'bigwin') return feedRich(items.reduce((a, b) => ((b.amount || 0) > (a.amount || 0) ? b : a), e));
  return feedRich(e);
}
export const FEED_ICON = { bigwin: 'bolt', ach: 'medal', achs: 'medal', jackpot: 'trophy', vip: 'star', motus: 'motus', shop: 'shop', week: 'trophy', quests: 'check', perfect: 'quiz', wheel: 'wheel', streak: 'higher', feat: 'bulb', farm: 'banana', replant: 'banana' };

// Chance de remporter le jackpot sur un spin payant de la slot (proportionnelle à la mise, plafonnée à 1 %)
export const JACKPOT_FACTOR = 1.5;
export function jackpotChance(bet, jackpot) { return Math.min(0.01, (JACKPOT_FACTOR * CONFIG.JACKPOT_RATE * bet) / Math.max(1, jackpot)); }
export function chanceText(p) {
  if (!(p > 0)) return '—';
  const one = Math.round(1 / p);
  return `1 sur ${fmt(one)} (${(p * 100).toLocaleString('fr-FR', { maximumSignificantDigits: 2 })} %)`;
}

export function createSocial(wallet, backend) {
  let entries = [], since = 0, jackpot = { amount: 0 }, pending = 0, timer = null, first = true, lastPost = 0, queue = [], alive = true;
  const subs = new Set();
  const notify = () => subs.forEach((cb) => { try { cb({ entries, jackpot: jackpotValue(), last: jackpot }); } catch (e) { console.error(e); } });
  const jackpotValue = () => CONFIG.JACKPOT_SEED + (jackpot.amount || 0) + Math.floor(pending);

  async function poll() {
    if (!alive || document.visibilityState === 'hidden') return;
    try {
      // contributions de la slot accumulées depuis le dernier passage
      if (pending >= 1) { const d = Math.floor(pending); pending -= d; try { await backend.addJackpot(d); } catch (e) { pending += d; throw e; } }
      const [fresh, jp] = await Promise.all([backend.fetchFeed(since, first ? 40 : 20), backend.getJackpot()]);
      jackpot = jp || { amount: 0 };
      if (fresh.length) {
        since = Math.max(since, ...fresh.map((e) => e.at || 0));
        // un message déjà affiché en local (même cid) est remplacé par sa version serveur, pas dupliqué
        const known = new Set(entries.map((e) => e.id));
        const add = fresh.filter((e) => !known.has(e.id));
        const cids = new Set(add.map((e) => e.cid).filter(Boolean));
        entries = [...add, ...entries.filter((e) => !(e.cid && cids.has(e.cid) && String(e.id).startsWith('local_')))].sort((a, b) => b.at - a.at).slice(0, 80);
        // petits toasts pour les exploits des autres (pas au premier chargement)
        if (!first) add.filter((e) => e.uid !== wallet.uid && ['jackpot', 'bigwin', 'week'].includes(e.kind)).slice(0, 2)
          .forEach((e) => toast(`<b>${esc(feedWho(e))}</b> ${esc(feedText(e))}`, e.kind === 'jackpot' ? 'win' : 'info', 5000));
      }
      first = false;
      notify();
    } catch (e) { console.warn('Fil d\'activité indisponible', e); }
  }

  // Publication : au plus un message toutes les 8 s ; les succès débloqués ensemble sont regroupés en un seul message
  const GAP = 8000;
  let flushTimer = null;
  function post(entry) {
    queue.push(entry);
    if (queue.length > 12) queue.splice(0, queue.length - 12);
    clearTimeout(flushTimer);
    // petite attente pour regrouper les succès qui tombent en même temps
    flushTimer = setTimeout(flushQueue, Math.max(1500, GAP - (Date.now() - lastPost)));
  }
  async function flushQueue() {
    if (!queue.length) return;
    if (Date.now() - lastPost < GAP) { clearTimeout(flushTimer); flushTimer = setTimeout(flushQueue, GAP - (Date.now() - lastPost)); return; }
    let e = queue.shift();
    if (e.kind === 'ach' && queue.some((x) => x.kind === 'ach')) {
      const all = [e, ...queue.filter((x) => x.kind === 'ach')].slice(0, 6);
      queue = queue.filter((x) => x.kind !== 'ach' || !all.includes(x));
      e = { kind: 'achs', ids: all.map((x) => x.id), names: all.map((x) => x.name) };
    }
    lastPost = Date.now();
    const full = { ...e, uid: wallet.uid, pseudo: wallet.pseudo, cid: Math.random().toString(36).slice(2, 10) };
    try { await backend.postFeed(full); } catch (err) { console.warn('Publication impossible', err); return; }
    entries = [{ ...full, id: 'local_' + Date.now(), at: Date.now() }, ...entries].slice(0, 80);
    notify();
    if (queue.length) { clearTimeout(flushTimer); flushTimer = setTimeout(flushQueue, GAP); }
  }

  async function hitJackpot() {
    try {
      const amount = await backend.winJackpot(wallet.uid, wallet.pseudo);
      if (!(amount > 0)) return;
      wallet.credit('jackpot', amount);
      jackpot = { amount: 0, lastWinner: wallet.uid, lastPseudo: wallet.pseudo, lastAmount: amount, lastAt: Date.now() };
      pending = 0;
      notify();
      sfx.bonus(); sfx.win(true); coinRain(90);
      post({ kind: 'jackpot', amount });
      modal({ title: 'JACKPOT !', html: `<div class="bonus-pop">${goldMonkeySVG('bonus-monkey')}<p>Tu remportes le jackpot commun de la jungle !</p><p class="big">${money(amount)}</p></div>`, buttons: [{ label: 'Incroyable !', value: true, primary: true }] });
    } catch (e) { console.warn('Jackpot : échec', e); }
  }

  const lastBig = {};
  const off = wallet.on((e) => {
    if (!e) return;
    if (e.type === 'bet' && e.game === 'slots') pending += e.amount * CONFIG.JACKPOT_RATE;
    if (e.type === 'round' && e.game === 'slots' && e.info && e.info.bet > 0) {
      // chance proportionnelle à la mise : en moyenne, le jackpot reverse ce qu'il reçoit
      const p = jackpotChance(e.info.bet, jackpotValue());
      if (randInt(1e9) < p * 1e9) hitJackpot();
    }
    if (e.type === 'win' && e.bet > 0) {
      const m = e.amount / e.bet;
      // seuils bas : on est entre potes, on veut voir passer les beaux coups
      // ×25 minimum (×100 au Plinkoko, où les grosses cases tombent souvent quand on enchaîne les billes),
      // et pas plus d'un message par jeu toutes les 10 min, sauf si le multiplicateur est plus gros que le précédent
      const min = BIG_MIN[e.game] || 25, last = lastBig[e.game];
      if (m >= min && (!last || Date.now() - last.at > 600000 || m > last.m)) {
        lastBig[e.game] = { at: Date.now(), m };
        post({ kind: 'bigwin', game: e.game, amount: e.amount, mult: Math.round(m * 10) / 10 });
      }
    }
    if (e.type === 'ach') {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      if (a) post({ kind: 'ach', id: a.id, name: a.name, tier: TIERS[a.tier].name });
    }
    if (e.type === 'shop') { const it = ITEMS.find((i) => i.id === e.item); if (it) post({ kind: 'shop', name: it.name }); }
    if (e.type === 'free' && e.extra && e.extra.Perfect) post({ kind: 'perfect', game: e.game, mode: 'ExpertPerfect' in e.extra ? 'expert' : 'HardPerfect' in e.extra ? 'difficile' : 'MediumPerfect' in e.extra ? 'moyen' : 'EasyPerfect' in e.extra ? 'facile' : '' });
    if (e.type === 'free' && e.game === 'higher' && e.extra && !e.extra.Perfect && e.extra.Correct >= 7) post({ kind: 'streak', amount: e.amount, n: e.extra.Correct });
    if (e.type === 'daily' && e.amount >= 2000) post({ kind: 'wheel', amount: e.amount, streak: e.streak });
    if (e.type === 'quest' && e.bonus) post({ kind: 'quests' });
    if (e.type === 'free' && e.meta && e.meta.feed && FEAT_GAMES[e.game]) post({ kind: 'feat', game: e.game, txt: String(e.meta.feed.txt || '').slice(0, 80), tail: String(e.meta.feed.tail || '').slice(0, 40) });
    if (e.type === 'farm' && e.act === 'milestone' && e.n >= 500) post({ kind: 'farm', n: e.n });
    if (e.type === 'farm' && e.act === 'replant') post({ kind: 'replant', gain: e.gain, seeds: e.seeds });
    if (e.type === 'vipup') post({ kind: 'vip', rank: e.rank, bonus: e.amount });
  });
  const onCustom = (ev) => { const d = ev.detail || {}; if (d.type === 'motus' && d.won) post({ kind: 'motus', tries: d.tries }); if (d.type === 'week') post({ kind: 'week', winner: d.winner, profit: d.profit }); };
  window.addEventListener('chibouk:feed', onCustom);

  timer = setInterval(poll, CONFIG.FEED_INTERVAL_MS);
  const onVis = () => { if (document.visibilityState === 'visible') poll(); };
  document.addEventListener('visibilitychange', onVis);
  setTimeout(poll, 1200);

  return {
    subscribe(cb) { subs.add(cb); cb({ entries, jackpot: jackpotValue(), last: jackpot }); return () => subs.delete(cb); },
    get jackpot() { return jackpotValue(); },
    refresh: poll,
    post,
    destroy() {
      alive = false; clearInterval(timer); off();
      window.removeEventListener('chibouk:feed', onCustom); document.removeEventListener('visibilitychange', onVis);
      if (pending >= 1) backend.addJackpot(Math.floor(pending)).catch(() => {});
    },
  };
}
