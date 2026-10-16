// Historique des 50 dernières parties de chaque jeu (gardé sur cet appareil, sans lecture en base)
import { fmt, esc } from './ui.js';
import { lazySave } from './lazysave.js';

const MAX = 50;
let key = null, data = {}, pend = {};

export function initHistory(wallet) {
  key = 'chibouk_history_' + wallet.uid;
  try { data = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { data = {}; }
  pend = {};
  const k = key, saver = lazySave(() => localStorage.setItem(k, JSON.stringify(data)), 500);
  const save = () => saver.save();
  const push = (g, entry) => { (data[g] = data[g] || []).unshift(entry); data[g] = data[g].slice(0, MAX); save(); };
  return wallet.on((e) => {
    if (!e || !wallet.stats.games[e.game]) return;
    if (e.type === 'win') {
      pend[e.game] = (pend[e.game] || 0) + e.amount;
      // gain sans manche juste après (tours gratuits de la slot) : ligne à part
      setTimeout(() => {
        if (pend[e.game] && pend[e.game] >= e.amount && e.game === 'slots' && !e._used) {
          push(e.game, { t: Date.now(), b: 0, p: pend[e.game], free: true });
          pend[e.game] = 0;
        }
      }, 0);
    }
    if (e.type === 'round') {
      const bet = (e.info && e.info.bet) || 0;
      const p = pend[e.game] || 0;
      pend[e.game] = 0;
      push(e.game, { t: Date.now(), b: bet, p: Math.max(p, e.payout || 0), d: detail(e.game, e.info || {}) });
    }
  });
}

// Petit détail lisible selon le jeu
function detail(g, i) {
  const m = (x) => '×' + (+x).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  switch (g) {
    case 'dice': return i.roll !== undefined ? `${String(i.roll.toFixed(2)).replace('.', ',')} (${i.mode === 'over' ? '>' : '<'} ${i.mode === 'over' ? (100 - i.chance).toFixed(2).replace('.', ',') : i.chance.toFixed(2).replace('.', ',')})` : '';
    case 'limbo': return i.result ? `${m(i.result)} / cible ${m(i.target)}` : '';
    case 'keno': return i.picks ? `${i.hits}/${i.picks} touchés` : '';
    case 'wheel': return i.mult !== undefined ? m(i.mult) : '';
    case 'crash': return i.crash ? `crash ${m(i.crash)}${i.cashed ? `, sorti ${m(i.cashed)}` : ''}` : '';
    case 'roulette': return i.number !== undefined ? `n° ${i.number}` : '';
    case 'plinko': return i.mult !== undefined ? m(i.mult) : '';
    case 'tower': return i.lostAt ? `explosé à l'étage ${i.lostAt}` : i.floors !== undefined ? `${i.floors} étage(s)` : '';
    case 'mines': return i.picks !== undefined ? `${i.picks} banane(s), ${i.mines} mine(s)${i.lost ? ', boum' : ''}` : '';
    case 'hilo': return i.steps !== undefined ? `${i.steps} bonne(s) réponse(s)${i.lost ? ', perdu' : ''}` : '';
    case 'slots': return i.scatters >= 3 ? 'bonus !' : i.mult ? m(i.mult) : '';
    case 'blackjack': return i.result === 'win' ? 'gagné' : i.result === 'lose' ? 'perdu' : i.result === 'push' ? 'égalité' : '';
  }
  return '';
}

export function historyOf(game) { return data[game] || []; }

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
export function historyHTML(game) {
  const list = historyOf(game);
  if (!list.length) return '<li class="muted gb-empty">Aucune partie pour l\'instant.</li>';
  return list.map((h) => {
    const net = h.p - h.b;
    const mult = h.b > 0 ? h.p / h.b : 0;
    return `<li class="hs-row ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}"><span class="hs-t">${timeFmt.format(h.t)}</span>
      <span class="hs-d">${h.free ? 'Tour gratuit' : `Mise ${fmt(h.b)}`}${h.d ? ` · ${esc(h.d)}` : ''}</span>
      <b>${net > 0 ? '+' : ''}${fmt(net)}${h.b > 0 && h.p > 0 ? ` <small>×${mult.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</small>` : ''}</b></li>`;
  }).join('');
}
