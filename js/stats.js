// Statistiques personnelles + classement (lu avec parcimonie pour économiser les lectures Firestore)
import { CONFIG } from './config.js';
import { $, fmt, money, esc, toast } from './ui.js';
import { icon } from './art.js';

let lbCache = { ts: 0, rows: null };
const GAMES = [
  { k: 'slots', name: 'Machine à sous' },
  { k: 'blackjack', name: 'Blackjack' },
  { k: 'roulette', name: 'Roulette' },
  { k: 'plinko', name: 'Plinko' },
  { k: 'crash', name: 'Crash' },
];
const GAME_LABEL = { slots: 'à la machine à sous', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au plinko', crash: 'au crash' };
const gname = (g) => `<span class="gname">${icon(g.k)}${g.name}</span>`;
const pct = (a, b) => (b ? (a / b * 100).toFixed(1).replace('.', ',') + ' %' : '—');
const signed = (n) => `<span class="${n >= 0 ? 'pos' : 'neg'}">${n >= 0 ? '+' : ''}${fmt(n)}</span>`;

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
      <div class="stat-card"><span>Bonus quotidiens</span><b>${fmt(s.dailyClaims)}</b><small>${fmt(s.dailyTotal)} ${CONFIG.CURRENCY} reçus</small></div>
      <div class="stat-card"><span>Casse-briques</span><b>${fmt(s.breakerLevels)} niveaux</b><small>${fmt(s.breakerTotal)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>Tours gratuits déclenchés</span><b>${fmt(s.games.slots.bonuses || 0)}</b><small>Blackjacks : ${fmt(s.games.blackjack.blackjacks || 0)}</small></div>
    </div>

    <div class="panel"><h2>Par jeu</h2>
      <div class="tbl-scroll"><table class="tbl"><thead><tr><th>Jeu</th><th class="r">Misé</th><th class="r">Gagné</th><th class="r">Bilan</th><th class="r">RTP réel</th><th class="r">Parties</th><th class="r">Gagnantes</th><th class="r">Plus gros gain</th></tr></thead>
      <tbody>${GAMES.map((g) => { const x = s.games[g.k]; return `<tr><td>${gname(g)}</td><td class="r">${fmt(x.wagered)}</td><td class="r">${fmt(x.won)}</td><td class="r">${signed(x.won - x.wagered)}</td><td class="r">${pct(x.won, x.wagered)}</td><td class="r">${fmt(x.rounds)}</td><td class="r">${pct(x.wins, x.rounds)}</td><td class="r">${fmt(x.biggestWin)}</td></tr>`; }).join('')}</tbody></table></div>
    </div>

    <div class="panel"><h2>Misé vs gagné <span class="legend"><span><i style="background:#f5c542"></i>Misé</span><span><i style="background:#3ddc84"></i>Gagné</span></span></h2>
      <div class="bars">${GAMES.map((g) => { const x = s.games[g.k]; return `
        <div class="bar-row"><span>${gname(g)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.wagered / maxW * 100}%"></div></div><span class="r">${fmt(x.wagered)}</span></div>
        <div class="bar-row"><span></span><div class="bar-track"><div class="bar-fill w" style="width:${x.won / maxW * 100}%"></div></div><span class="r">${fmt(x.won)}</span></div>`; }).join('')}
      </div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement des singes</span> <button class="btn btn-ghost btn-sm" id="lb-refresh">Actualiser</button></h2>
      <div id="lb"><p class="muted">Chargement…</p></div>
      <p class="muted" style="font-size:.78rem;margin:10px 0 0">Les soldes des autres joueurs sont mis à jour toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s environ, et le classement est gardé en cache ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min pour économiser la base de données.</p>
    </div>`;
    $('#lb-refresh', view).onclick = () => loadLB(true);
    loadLB(false);
  };

  async function loadLB(force) {
    const box = $('#lb', view);
    const fresh = Date.now() - lbCache.ts < CONFIG.LEADERBOARD_CACHE_MS;
    if (force && fresh) toast(`Classement déjà à jour (cache de ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min)`);
    if (!lbCache.rows || !fresh) {
      try {
        await wallet.flush();
        lbCache = { ts: Date.now(), rows: await backend.leaderboard(CONFIG.LEADERBOARD_SIZE) };
      } catch (e) {
        console.error(e);
        if (alive && box) box.innerHTML = `<p class="neg">Impossible de charger le classement (${esc(e.message)}).</p>`;
        return;
      }
    }
    if (!alive || !box) return;
    const rows = lbCache.rows.map((r) => (r.uid === wallet.uid ? { ...r, balance: wallet.balance, stats: wallet.stats } : r))
      .sort((a, b) => b.balance - a.balance);
    box.innerHTML = `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Joueur</th><th class="r">Solde</th><th class="r">Total misé</th><th class="r">Plus gros gain</th><th class="r">Bilan jeux</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td>${esc(r.pseudo)}${r.uid === wallet.uid ? ' (toi)' : ''}</td>
      <td class="r"><b>${fmt(r.balance)}</b></td><td class="r">${fmt(r.stats.totalWagered)}</td><td class="r">${fmt(r.stats.biggestWin)}</td><td class="r">${signed(r.stats.totalWon - r.stats.totalWagered)}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  render();
  return () => { alive = false; };
}
