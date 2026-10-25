// Fil d'activité « En direct de la jungle », chat et jackpot commun de la slot.
// V37 : fil et chat en temps réel (écoute Firestore) tant que le joueur est là : 1 lecture par nouveau message,
// débranchés quand il est inactif. Le jackpot est relu toutes les 2 min (1 lecture) et les contributions partent
// toutes les 5 min.
import { CONFIG } from './config.js';
import { isIdle, onWake } from './activity.js';
import { randInt } from './games/slots-math.js';
import { ACHIEVEMENTS, TIERS } from './achievements.js';
import { vipOf } from './progress.js';
import { ITEMS } from './shop.js';
import { esc, fmt, money, toast, modal, coinRain } from './ui.js';
import { goldMonkeySVG } from './art.js';
import { sfx } from './sfx.js';

const GAME_NAMES = { slots: 'la Chibouk Slot', jungle: 'à la Jungle Connect', craps: 'au Craps', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue du Singe', limbo: 'au Limbo', scratch: 'aux jeux à gratter' };
const WONDER_NAMES = { temple: 'Temple du Singe d\'or', port: 'Grand Port', obs: 'Observatoire', arbre: 'Arbre-Monde' };
const AT = (g) => (g === 'slots' ? 'à la Chibouk Slot' : GAME_NAMES[g] || '');
const mx = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

const QUIZ_LABEL = { quiz: 'au calcul mental', capitals: 'au quiz capitales', movies: 'au quiz ciné', flags: 'au quiz drapeaux', higher: 'au Plus ou moins', geo: 'au quiz géographie', culture: 'au quiz Culture G' };
const QUIZ_ROUTE = { quiz: 'quiz', capitals: 'capitals', movies: 'movies', flags: 'flags', higher: 'higher', geo: 'geo', culture: 'culture' };
// Jeux de réflexion : exploits publiés avec un texte (« a résolu un » + lien vers le jeu + « difficile en 5 min »)
const BIG_MIN = { plinko: 100 };
export const FEAT_GAMES = { queens: 'Queens', tango: 'Tango', pinpoint: 'Pinpoint', sudoku: 'Sudoku', demineur: 'Démineur', snake: 'Snake', memory: 'Memory', crossword: 'mots croisés', typing: 'Frappe éclair' };
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
    case 'prestige': return `a fait un prestige de sa ferme (niveau ${e.pr}, production ×${(e.pr || 0) + 1})`;
    case 'replant': return `a replanté sa ferme et gagne ${e.gain} graine${e.gain > 1 ? 's' : ''} d'or (${e.seeds} au total)`;
    case 'farm': return `a une ferme qui produit plus de ${fmt(e.n)} bananes par heure`;
    case 'feat': return `${e.txt || ''} ${FEAT_GAMES[e.game] || ''}${e.tail ? ' ' + e.tail : ''}`;
    case 'loot': return `a ouvert une ${e.box || 'caisse'} et décroché « ${e.txt || ''} »${e.sub ? ` (${e.sub})` : ''}, lot ${e.r === 'gold' ? 'MYTHIQUE' : 'légendaire'} !`;
    case 'challenge': return `${e.place > 1 ? `finit ${e.place}e du` : 'a remporté le'} défi de la jungle (+${fmt(e.amount)} Brundles)${e.txt ? ` : ${e.txt}` : ''}`;
    case 'cosm': return `a débloqué l'objet exclusif « ${e.name} »`;
    case 'expedition': return `a trouvé « ${e.name} » en expédition (${e.place || 'ferme'})`;
    case 'wonder': return e.level >= 5 ? `a achevé la merveille « ${e.name} » !` : `a construit la merveille « ${e.name} »`;
    default: return e.text || '';
  }
}
// Version enrichie (liens vers le jeu, survol des succès, fiche du joueur)
const GAME_ROUTE = { slots: 'slots', jungle: 'jungle', craps: 'craps', blackjack: 'blackjack', roulette: 'roulette', plinko: 'plinko', crash: 'crash', tower: 'tower', mines: 'mines', dice: 'dice', hilo: 'hilo', keno: 'keno', wheel: 'wheel', limbo: 'limbo', scratch: 'scratch' };
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
    case 'prestige': t = `a fait un prestige de sa ${L('#/farm', 'ferme')} : production <b class="gold">×${(e.pr || 0) + 1}</b> pour toujours`; break;
    case 'replant': t = `a replanté sa ${L('#/farm', 'ferme')} et gagne <b class="gold">${e.gain} graine${e.gain > 1 ? 's' : ''} d'or</b> (${e.seeds} au total)`; break;
    case 'farm': t = `a une ${L('#/farm', 'ferme')} qui produit plus de <b class="gold">${fmt(e.n)}</b> bananes par heure`; break;
    case 'feat': t = `${esc(e.txt || '')} ${FEAT_GAMES[e.game] ? L('#/' + e.game, FEAT_GAMES[e.game]) : ''}${e.tail ? ' ' + esc(e.tail) : ''}`; break;
    case 'loot': t = `a ouvert une ${L('#/cases', esc(e.box || 'caisse'))} et décroché <b class="${e.r === 'gold' ? 'gold' : 'neg'}">« ${esc(e.txt || '')} »</b>${e.sub ? ` <small class="muted">(${esc(e.sub)})</small>` : ''}, lot ${e.r === 'gold' ? '<b class="gold">MYTHIQUE</b>' : 'légendaire'} !`; break;
    case 'challenge': t = `${e.place > 1 ? `finit <b>${e.place}e</b> du` : 'a remporté le'} ${L('#/lobby', 'défi de la jungle')} et touche <b class="gold">${fmt(e.amount)}</b> Brundles${e.txt ? ` <small class="muted">(${esc(e.txt)})</small>` : ''}`; break;
    case 'cosm': t = `a débloqué l'objet exclusif ${L('#/shop', `<b class="gold">« ${esc(e.name)} »</b>`)}`; break;
    case 'expedition': t = `a trouvé ${L('#/shop', `<b class="gold">« ${esc(e.name)} »</b>`)} en ${L('#/farm', 'expédition')} <small class="muted">(${esc(e.place || '')})</small>`; break;
    case 'wonder': t = `${e.level >= 5 ? 'a achevé' : 'a construit'} la merveille ${L('#/farm', `<b class="gold">« ${esc(e.name)} »</b>`)}${e.level >= 5 ? ' !' : ''}`; break;
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
// Ligne affichée pour un groupe : le message le plus récent, les succès fusionnés
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
  // gros gains regroupés : on affiche le plus récent (avec son heure) ; avant la V30, le plus gros du groupe s'affichait
  // avec l'heure du plus récent, et un gain d'il y a plusieurs heures semblait tout frais
  return feedRich(e);
}
export const FEED_ICON = { bigwin: 'bolt', ach: 'medal', achs: 'medal', jackpot: 'trophy', vip: 'star', motus: 'motus', shop: 'shop', week: 'trophy', quests: 'check', perfect: 'quiz', wheel: 'wheel', streak: 'higher', feat: 'bulb', farm: 'banana', replant: 'banana', prestige: 'star', challenge: 'flag', loot: 'crate', cosm: 'star', expedition: 'globe', wonder: 'tower' };

// Chance de remporter le jackpot sur un spin payant de la slot (proportionnelle à la mise, plafonnée à 1 %)
export const JACKPOT_FACTOR = 1.5;
export function jackpotChance(bet, jackpot) { return Math.min(0.01, (JACKPOT_FACTOR * CONFIG.JACKPOT_RATE * bet) / Math.max(1, jackpot)); }
export function chanceText(p) {
  if (!(p > 0)) return '—';
  const one = Math.round(1 / p);
  return `1 sur ${fmt(one)} (${(p * 100).toLocaleString('fr-FR', { maximumSignificantDigits: 2 })} %)`;
}

const FEED_LS = 'chibouk_feed_v1';
const FEED_MARGIN = 5 * 60000;
// on garde 80 messages du fil et 60 messages de chat (les deux arrivent par la même collection « feed »)
const capEntries = (list) => { const chat = list.filter((e) => e.kind === 'chat').slice(0, 30), rest = list.filter((e) => e.kind !== 'chat').slice(0, 80); return [...chat, ...rest].sort((a, b) => b.at - a.at); };
const CHAT_LS = 'chibouk_chat_v2', CHAT_N = 80;
export function createSocial(wallet, backend) {
  // chat (V28) : collection « chat » à part, triée par l'heure du serveur ; chats = les CHAT_N derniers messages
  let chats = [], chatTs = 0;
  try { const c = JSON.parse(localStorage.getItem(CHAT_LS) || 'null'); if (c && Array.isArray(c.list)) { chats = c.list; chatTs = c.ts || 0; } } catch {}
  const keepChat = () => { try { localStorage.setItem(CHAT_LS, JSON.stringify({ ts: chatTs, list: chats.filter((e) => !String(e.id).startsWith('local_')) })); } catch {} };
  function mergeChat(fresh, full = false) {
    const known = new Set(chats.map((e) => e.id)), cids = new Set(fresh.map((e) => e.cid).filter(Boolean));
    const add = fresh.filter((e) => !known.has(e.id));
    let base = chats.filter((e) => !(e.cid && cids.has(e.cid) && String(e.id).startsWith('local_')));
    if (full) base = base.filter((e) => String(e.id).startsWith('local_')); // relecture complète : la liste du serveur fait foi
    chats = [...(full ? fresh : add), ...base].sort((a, b) => a.at - b.at).slice(-CHAT_N);
    const srv = fresh.filter((e) => !e.pending).map((e) => e.at || 0); // heure estimée d'un message pas encore confirmé : ignorée
    if (srv.length) chatTs = Math.max(chatTs, ...srv);
    return add;
  }
  // tout ce que voient les abonnés : fil + anciens messages de chat passés par le fil + chat
  const allEntries = () => [...entries, ...chats];
  let entries = [], since = 0, jackpot = { amount: 0 }, pending = 0, timer = null, first = true, lastPost = 0, queue = [], alive = true, lastPush = Date.now(), lastPoll = 0;
  // fil gardé dans le navigateur : au rechargement de la page, on ne relit que les nouveaux messages
  try {
    const c = JSON.parse(localStorage.getItem(FEED_LS) || 'null');
    if (c && Array.isArray(c.entries) && Date.now() - (c.since || 0) < 3 * 86400000) { entries = c.entries; since = c.since || 0; if (c.jackpot) jackpot = c.jackpot; }
  } catch {}
  const keepFeed = () => { try { localStorage.setItem(FEED_LS, JSON.stringify({ since, jackpot, entries: entries.filter((e) => !String(e.id).startsWith('local_')).slice(0, 70) })); } catch {} };
  const subs = new Set();
  const notify = () => subs.forEach((cb) => { try { cb({ entries: allEntries(), jackpot: jackpotValue(), last: jackpot }); } catch (e) { console.error(e); } });
  const jackpotValue = () => CONFIG.JACKPOT_SEED + (jackpot.amount || 0) + Math.floor(pending);

  // contributions de la slot au jackpot : regroupées, 1 écriture toutes les JACKPOT_PUSH_MS au plus
  async function pushJackpot(force = false) {
    if (pending < 1 || (!force && Date.now() - lastPush < CONFIG.JACKPOT_PUSH_MS)) return;
    const d = Math.floor(pending); pending -= d; lastPush = Date.now();
    try { await backend.addJackpot(d); } catch (e) { pending += d; throw e; }
  }

  // Lecture du fil + jackpot : seulement si quelqu'un regarde (onglet visible, joueur actif depuis moins de IDLE_MS)
  async function poll(force = false) {
    if (!alive || (!force && isIdle())) return;
    if (!force && Date.now() - lastPoll < 20000) return; // pas de double lecture (retour sur l'onglet + minuterie)
    lastPoll = Date.now();
    try {
      await pushJackpot();
      // marge de 5 min : l'heure d'un message est celle de l'appareil qui l'envoie ; une horloge un peu en retard
      // faisait passer ses messages sous « since » et ils n'étaient jamais lus (ex. vainqueur d'un défi resté inconnu)
      // en temps réel, le fil et le chat arrivent tout seuls : on ne relit que le jackpot
      const [fresh, jp, msgs] = await Promise.all([live ? [] : backend.fetchFeed(since ? since - FEED_MARGIN : 0, since ? 30 : 40), backend.getJackpot(),
        !live && backend.fetchChat ? backend.fetchChat(chatTs, chatTs ? 50 : CHAT_N).catch((e) => { console.warn('Chat indisponible', e); return null; }) : null]);
      jackpot = jp || { amount: 0 };
      if (msgs) {
        // trop de nouveaux messages d'un coup (longue absence) : on relit les CHAT_N derniers pour ne pas laisser de trou
        const full = !chatTs || msgs.length >= 50;
        const list = full && chatTs ? await backend.fetchChat(0, CHAT_N) : msgs;
        const add = mergeChat(list, full);
        if (!first && add.some((e) => e.uid !== wallet.uid)) window.dispatchEvent(new CustomEvent('chibouk:chat'));
        keepChat();
      }
      addFeed(fresh, !first);
      first = false;
      keepFeed();
      notify();
    } catch (e) { console.warn('Fil d\'activité indisponible', e); }
  }
  function addFeed(fresh, toasts) {
    if (!fresh.length) return;
    since = Math.max(since, ...fresh.map((e) => e.at || 0));
    // un message déjà affiché en local (même cid) est remplacé par sa version serveur, pas dupliqué
    const known = new Set(entries.map((e) => e.id));
    const add = fresh.filter((e) => !known.has(e.id));
    const cids = new Set(add.map((e) => e.cid).filter(Boolean));
    entries = capEntries([...add, ...entries.filter((e) => !(e.cid && cids.has(e.cid) && String(e.id).startsWith('local_')))].sort((a, b) => b.at - a.at));
    // petits toasts pour les exploits des autres (pas au premier chargement)
    if (toasts) add.filter((e) => e.uid !== wallet.uid && ['jackpot', 'bigwin', 'week', 'challenge', 'loot'].includes(e.kind)).slice(0, 2)
      .forEach((e) => toast(`<b>${esc(feedWho(e))}</b> ${esc(feedText(e))}`, e.kind === 'jackpot' ? 'win' : 'info', 5000));
  }

  /* ---------- temps réel (V37) : fil et chat écoutés en direct tant que le joueur est là ---------- */
  // Débranché dès que le joueur est inactif (onglet caché ou 4 min sans rien faire), rebranché à son retour sur
  // les seuls messages arrivés entre-temps : un onglet oublié ne coûte rien.
  const live = !!(backend.watchFeed && backend.watchChat);
  let offFeed = null, offChat = null, firstFeed = true, firstChat = true;
  function attach() {
    if (!live || !alive || offFeed || isIdle()) return;
    firstFeed = firstChat = true;
    offFeed = backend.watchFeed(since ? since - FEED_MARGIN : 0, since ? 30 : 40, (fresh) => {
      if (!alive) return;
      addFeed(fresh, !firstFeed); // pas de toasts pour les messages déjà là au branchement
      firstFeed = false;
      keepFeed(); notify();
    });
    offChat = backend.watchChat(chatTs, chatTs ? 50 : CHAT_N, async (msgs) => {
      if (!alive) return;
      // longue absence (50 nouveaux messages ou plus) : on relit les CHAT_N derniers pour ne pas laisser de trou
      const full = !chatTs || (firstChat && msgs.length >= 50);
      const list = full && chatTs ? await backend.fetchChat(0, CHAT_N).catch(() => msgs) : msgs;
      const add = mergeChat(list, full);
      if (!firstChat && add.some((e) => e.uid !== wallet.uid)) window.dispatchEvent(new CustomEvent('chibouk:chat'));
      firstChat = false;
      keepChat(); notify();
    });
  }
  function detach() { offFeed && offFeed(); offChat && offChat(); offFeed = offChat = null; }

  // Publication : au plus un message toutes les 8 s ; les succès débloqués ensemble sont regroupés en un seul message
  const GAP = 8000;
  let flushTimer = null;
  function post(entry) {
    // un défi remporté passe devant (les autres joueurs l'apprennent par le fil)
    if (entry.kind === 'challenge') queue.unshift(entry); else queue.push(entry);
    if (queue.length > 12) { const top = queue.filter((x) => x.kind === 'challenge'), rest = queue.filter((x) => x.kind !== 'challenge'); queue = [...top, ...rest.slice(-Math.max(0, 12 - top.length))]; }
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
    entries = capEntries([{ ...full, id: 'local_' + Date.now(), at: Date.now() }, ...entries]);
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
    if (e.type === 'farm' && e.act === 'prestige') post({ kind: 'prestige', pr: e.pr });
    if (e.type === 'farm' && e.act === 'wonder' && (e.level === 1 || e.level === 5)) post({ kind: 'wonder', name: WONDER_NAMES[e.wonder] || e.wonder, level: e.level });
    if (e.type === 'vipup') post({ kind: 'vip', rank: e.rank, bonus: e.amount });
  });
  const onCustom = (ev) => { const d = ev.detail || {}; if (d.type === 'motus' && d.won) post({ kind: 'motus', tries: d.tries }); if (d.type === 'expedition') post({ kind: 'expedition', name: d.name, place: d.place }); if (d.type === 'week') post({ kind: 'week', winner: d.winner, profit: d.profit }); };
  window.addEventListener('chibouk:feed', onCustom);

  // relecture toutes les FEED_INTERVAL_MS, ou toutes les 45 s quand le chat est ouvert à l'écran
  let fast = false;
  timer = setInterval(() => {
    if (live) { if (isIdle()) detach(); else attach(); } // écoute en direct seulement quand le joueur est là
    if (Date.now() - lastPoll >= (fast && !live ? 45000 : CONFIG.FEED_INTERVAL_MS) - 500) poll();
  }, 5000);
  const offWake = onWake(() => { attach(); poll(); }); // retour sur l'onglet ou reprise après une pause
  setTimeout(attach, 300);
  const onLeave = () => { pushJackpot(true).catch(() => {}); };
  window.addEventListener('pagehide', onLeave);
  setTimeout(() => poll(true), 1200);

  return {
    subscribe(cb) { subs.add(cb); cb({ entries: allEntries(), jackpot: jackpotValue(), last: jackpot }); return () => subs.delete(cb); },
    get jackpot() { return jackpotValue(); },
    refresh: () => poll(true),
    post,
    set fast(v) { const was = fast; fast = !!v; if (fast && !was && !live && Date.now() - lastPoll > 30000) poll(); },
    live,
    // message de chat : envoyé tout de suite (1 écriture), sans passer par la file du fil d'activité
    async say(text) {
      const tg = Array.isArray(wallet.p.tags) && wallet.p.tags.length ? { tg: wallet.p.tags } : {};
      const full = { text, uid: wallet.uid, pseudo: wallet.pseudo, cid: Math.random().toString(36).slice(2, 10), ...tg };
      await backend.postChat(full);
      // en direct, le message revient tout seul par l'écoute ; sinon on l'affiche tout de suite en local
      if (!live || !offChat) chats = [...chats, { ...full, kind: 'chat', id: 'local_' + Date.now(), at: Date.now() }].slice(-CHAT_N);
      notify();
    },
    destroy() {
      alive = false; clearInterval(timer); off(); detach();
      window.removeEventListener('chibouk:feed', onCustom); offWake(); window.removeEventListener('pagehide', onLeave);
      pushJackpot(true).catch(() => {});
    },
  };
}
