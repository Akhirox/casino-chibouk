// Statistiques personnelles (les classements sont dans ranking.js)
import { CONFIG } from './config.js';
import { $, fmt, money, esc, toast } from './ui.js';
import { icon } from './art.js';
import { getPlayers, playersFresh } from './players.js';
import { avatarHTML } from './profile.js';
import { titleHTML } from './shop.js';
import { vipBadge } from './progress.js';
import { weekId, prevWeekId } from './wallet.js';
import { weeklyRows, getWeeks, syncWeeks } from './weekly.js';

export const GAMES = [
  { k: 'slots', name: 'Chibouk Slot' },
  { k: 'blackjack', name: 'Blackjack' },
  { k: 'roulette', name: 'Roulette' },
  { k: 'plinko', name: 'Plinkoko' },
  { k: 'crash', name: 'Crashibouk' },
  { k: 'tower', name: 'Tower' },
  { k: 'mines', name: 'Mines' },
  { k: 'dice', name: 'Dice' },
  { k: 'hilo', name: 'Hi-Lo' },
  { k: 'keno', name: 'Keno' },
  { k: 'wheel', name: 'Roue du Singe' },
  { k: 'limbo', name: 'Limbo' },
];
export const GAME_LABEL = { slots: 'à la machine à sous', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue du Singe', limbo: 'au Limbo' };
export const gname = (g) => `<span class="gname">${icon(g.k)}${g.name}</span>`;
export const pct = (a, b) => (b ? (a / b * 100).toFixed(1).replace('.', ',') + ' %' : '—');
export const signed = (n) => `<span class="${n >= 0 ? 'pos' : 'neg'}">${n >= 0 ? '+' : ''}${fmt(n)}</span>`;

export function mount(view, { wallet, backend }) {
  let alive = true;
  const render = () => {
    const s = wallet.stats;
    const net = s.totalWon - s.totalWagered;
    const maxW = Math.max(1, ...GAMES.map((g) => Math.max(s.games[g.k].wagered, s.games[g.k].won)));
    view.innerHTML = `
    <div class="game-head"><h1>Mes <span>stats</span></h1></div>
    <div class="stats-grid">
      <div class="stat-card hl"><span>Solde actuel</span><b>${money(wallet.balance)}</b><small>Record : ${fmt(s.peakBalance)}</small></div>
      <div class="stat-card"><span>Total misé (wager)</span><b>${money(s.totalWagered)}</b><small>${fmt(s.rounds)} parties jouées</small></div>
      <div class="stat-card"><span>Total gagné</span><b>${money(s.totalWon)}</b><small>Redistribution : ${pct(s.totalWon, s.totalWagered)}</small></div>
      <div class="stat-card"><span>Bilan des jeux</span><b>${signed(net)}</b><small>gagné − misé</small></div>
      <div class="stat-card"><span>Plus gros gain</span><b>${money(s.biggestWin)}</b><small>${s.biggestWinGame ? GAME_LABEL[s.biggestWinGame] || '' : '—'}</small></div>
      <div class="stat-card"><span>Roue du jour</span><b>${fmt(s.dailyClaims)} tours</b><small>${fmt(s.dailyTotal)} ${CONFIG.CURRENCY} reçus · série : ${fmt((wallet.p.streak && wallet.p.streak.n) || 0)} j (record ${fmt((wallet.p.streak && wallet.p.streak.best) || 0)})</small></div>
      <div class="stat-card"><span>Quêtes du jour</span><b>${fmt(s.questsDone || 0)} terminées</b><small>${fmt(s.questTotal || 0)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>VIP & jackpot</span><b>${vipBadge(wallet.p)}</b><small>Rakeback : ${fmt(s.rakebackTotal || 0)} · bonus de rang : ${fmt(s.vipupTotal || 0)} · jackpots : ${fmt(s.jackpotTotal || 0)} · boutique : −${fmt(s.shopSpent || 0)}</small></div>
      <div class="stat-card"><span>Casse-briques</span><b>${fmt(s.breakerLevels)} niveaux</b><small>${fmt(s.breakerTotal)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>Calcul mental</span><b>${fmt(s.quizCorrect || 0)} bonnes rép.</b><small>${fmt(s.quizRounds || 0)} parties · ${fmt(s.quizTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.quizPerfect || 0)} sans-faute${s.quizHardCorrect ? ` · difficile : ${fmt(s.quizHardCorrect)} bonnes rép., ${fmt(s.quizHardPerfect || 0)} sans-faute` : ''}</small></div>
      <div class="stat-card"><span>Quiz capitales</span><b>${fmt(s.capitalsCorrect || 0)} bonnes rép.</b><small>${fmt(s.capitalsRounds || 0)} parties · ${fmt(s.capitalsTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.capitalsPerfect || 0)} sans-faute${s.capitalsExpertCorrect ? ` · expert : ${fmt(s.capitalsExpertCorrect)} bonnes rép., ${fmt(s.capitalsExpertPerfect || 0)} sans-faute` : ''}</small></div>
      <div class="stat-card"><span>Quiz drapeaux</span><b>${fmt(s.flagsCorrect || 0)} bonnes rép.</b><small>${fmt(s.flagsRounds || 0)} parties · ${fmt(s.flagsTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.flagsPerfect || 0)} sans-faute</small></div>
      <div class="stat-card"><span>Mot du jour</span><b>${fmt(s.motusWon || 0)} trouvés</b><small>${fmt(s.motusRounds || 0)} parties · ${fmt(s.motusTotal || 0)} ${CONFIG.CURRENCY} · série ${fmt(s.motusStreak || 0)} (record ${fmt(s.motusBestStreak || 0)})</small></div>
      <div class="stat-card"><span>Plus ou moins</span><b>Record : ${fmt(s.higherBest || 0)}</b><small>${fmt(s.higherRounds || 0)} parties · ${fmt(s.higherTotal || 0)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>Quiz ciné</span><b>${fmt(s.moviesCorrect || 0)} bonnes rép.</b><small>${fmt(s.moviesRounds || 0)} parties · ${fmt(s.moviesTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.moviesPerfect || 0)} sans-faute</small></div>
      <div class="stat-card"><span>Transferts</span><b>${signed((s.transfersReceived || 0) - (s.transfersSent || 0))}</b><small>Reçus ${fmt(s.transfersReceived || 0)} · envoyés ${fmt(s.transfersSent || 0)}</small></div>
      <div class="stat-card"><span>Tours gratuits déclenchés</span><b>${fmt(s.games.slots.bonuses || 0)}</b><small>Blackjacks : ${fmt(s.games.blackjack.blackjacks || 0)}</small></div>
    </div>

    <div class="panel"><h2>Par jeu</h2>
      <div class="tbl-scroll"><table class="tbl"><thead><tr><th>Jeu</th><th class="r">Misé</th><th class="r">Gagné</th><th class="r">Bilan</th><th class="r">RTP réel</th><th class="r">Parties</th><th class="r">Gagnantes</th><th class="r">Plus gros gain</th><th class="r">Meilleur multi</th></tr></thead>
      <tbody>${GAMES.map((g) => { const x = s.games[g.k]; return `<tr><td>${gname(g)}</td><td class="r">${fmt(x.wagered)}</td><td class="r">${fmt(x.won)}</td><td class="r">${signed(x.won - x.wagered)}</td><td class="r">${pct(x.won, x.wagered)}</td><td class="r">${fmt(x.rounds)}</td><td class="r">${pct(x.wins, x.rounds)}</td><td class="r">${fmt(x.biggestWin)}</td><td class="r">${x.bestMult ? '×' + x.bestMult.toFixed(2).replace('.', ',') : '—'}</td></tr>`; }).join('')}</tbody></table></div>
    </div>

    <div class="panel"><h2>Misé vs gagné <span class="legend"><span><i style="background:#f5c542"></i>Misé</span><span><i style="background:#3ddc84"></i>Gagné</span></span></h2>
      <div class="bars">${GAMES.map((g) => { const x = s.games[g.k]; return `
        <div class="bar-row"><span>${gname(g)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.wagered / maxW * 100}%"></div></div><span class="r">${fmt(x.wagered)}</span></div>
        <div class="bar-row"><span></span><div class="bar-track"><div class="bar-fill w" style="width:${x.won / maxW * 100}%"></div></div><span class="r">${fmt(x.won)}</span></div>`; }).join('')}
      </div>
    </div>
    <p class="muted stats-more">Les classements, le palmarès des semaines et les chiffres de tout le casino sont sur la page <a href="#/ranking">Classements</a>.</p>`;
  };

  render();
  return () => { alive = false; };
}
