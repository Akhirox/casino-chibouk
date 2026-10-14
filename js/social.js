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

const GAME_NAMES = { slots: 'la Chibouk Slot', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue du Singe', limbo: 'au Limbo' };
const AT = (g) => (g === 'slots' ? 'à la Chibouk Slot' : GAME_NAMES[g] || '');
const mx = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

// Qui est le sujet du message (pour la semaine : le vainqueur, pas celui qui a publié)
export const feedWho = (e) => (e.kind === 'week' && e.winner ? e.winner : e.pseudo);
// Texte d'un message du fil (le pseudo est ajouté à l'affichage)
export function feedText(e) {
  switch (e.kind) {
    case 'bigwin': return `a gagné ${fmt(e.amount)} Brundles (${mx(e.mult)}) ${AT(e.game)}`;
    case 'ach': return `a débloqué le succès « ${e.name} » (${e.tier})`;
    case 'jackpot': return `a remporté le JACKPOT : ${fmt(e.amount)} Brundles !`;
    case 'vip': return `est passé au rang VIP ${e.rank}`;
    case 'motus': return `a trouvé le mot du jour en ${e.tries} essai${e.tries > 1 ? 's' : ''}`;
    case 'shop': return `s'est offert « ${e.name} » à la boutique`;
    case 'week': return `remporte le classement de la semaine (${e.profit >= 0 ? '+' : ''}${fmt(e.profit)} Brundles)`;
    case 'quests': return 'a terminé ses 3 quêtes du jour';
    default: return e.text || '';
  }
}
export const FEED_ICON = { bigwin: 'bolt', ach: 'medal', jackpot: 'trophy', vip: 'star', motus: 'quiz', shop: 'gift', week: 'trophy', quests: 'check' };

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
      const [fresh, jp] = await Promise.all([backend.fetchFeed(since, first ? 25 : 15), backend.getJackpot()]);
      jackpot = jp || { amount: 0 };
      if (fresh.length) {
        since = Math.max(since, ...fresh.map((e) => e.at || 0));
        const known = new Set(entries.map((e) => e.id));
        const add = fresh.filter((e) => !known.has(e.id));
        entries = [...add, ...entries].sort((a, b) => b.at - a.at).slice(0, 30);
        // petits toasts pour les exploits des autres (pas au premier chargement)
        if (!first) add.filter((e) => e.uid !== wallet.uid && ['jackpot', 'bigwin', 'week'].includes(e.kind)).slice(0, 2)
          .forEach((e) => toast(`<b>${esc(feedWho(e))}</b> ${esc(feedText(e))}`, e.kind === 'jackpot' ? 'win' : 'info', 5000));
      }
      first = false;
      notify();
    } catch (e) { console.warn('Fil d\'activité indisponible', e); }
  }

  // Publication (au plus un message toutes les 20 s, les autres attendent)
  async function post(entry) {
    queue.push(entry);
    if (Date.now() - lastPost < 20000) { setTimeout(flushQueue, 20000 - (Date.now() - lastPost)); return; }
    flushQueue();
  }
  async function flushQueue() {
    if (!queue.length || Date.now() - lastPost < 20000) return;
    const e = queue.shift();
    lastPost = Date.now();
    const full = { ...e, uid: wallet.uid, pseudo: wallet.pseudo };
    try { await backend.postFeed(full); } catch (err) { console.warn('Publication impossible', err); return; }
    entries = [{ ...full, id: 'local_' + Date.now(), at: Date.now() }, ...entries].slice(0, 30);
    notify();
    if (queue.length) setTimeout(flushQueue, 20000);
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

  let lastVip = vipOf(wallet.stats.totalWagered).index;
  const off = wallet.on((e) => {
    if (!e) return;
    if (e.type === 'bet' && e.game === 'slots') pending += e.amount * CONFIG.JACKPOT_RATE;
    if (e.type === 'round' && e.game === 'slots' && e.info && e.info.bet > 0) {
      // chance proportionnelle à la mise : en moyenne, le jackpot reverse ce qu'il reçoit
      const p = Math.min(0.01, (1.5 * CONFIG.JACKPOT_RATE * e.info.bet) / jackpotValue());
      if (randInt(1e9) < p * 1e9) hitJackpot();
    }
    if (e.type === 'win' && e.bet > 0) {
      const m = e.amount / e.bet;
      if (m >= 100 || (m >= 25 && e.amount >= 100000) || e.amount >= 5000000) post({ kind: 'bigwin', game: e.game, amount: e.amount, mult: Math.round(m * 10) / 10 });
    }
    if (e.type === 'ach') {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      if (a && (a.tier === 'gold' || a.tier === 'legend')) post({ kind: 'ach', name: a.name, tier: TIERS[a.tier].name });
    }
    if (e.type === 'shop') { const it = ITEMS.find((i) => i.id === e.item); if (it && it.price >= 1000000) post({ kind: 'shop', name: it.name }); }
    if (e.type === 'quest' && e.bonus) post({ kind: 'quests' });
    if (e.type === 'bet') {
      const v = vipOf(wallet.stats.totalWagered);
      if (v.index > lastVip) { lastVip = v.index; post({ kind: 'vip', rank: v.name }); toast(`Nouveau rang VIP : <b>${v.name}</b> ! Remboursement de ${Math.round(v.cb * 100)} % de tes pertes chaque semaine.`, 'win', 6000); }
    }
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
