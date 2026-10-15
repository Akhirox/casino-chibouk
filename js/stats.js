// Stats : les miennes + les chiffres de tout le casino (les classements sont dans ranking.js)
import { CONFIG } from './config.js';
import { $, $$, fmt, money, esc, toast } from './ui.js';
import { fmtTime } from './games/free-common.js';
import { hasFarm } from './farm.js';
import { productionPerHour } from './farm-core.js';
import { icon } from './art.js';
import { getPlayers, playersFresh } from './players.js';
import { avatarHTML } from './profile.js';
import { vipBadge, vipOf, xMult } from './progress.js';

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

// Brundles distribués hors jeux (bonus, quiz, succès…), pour les chiffres globaux
const FREE_KEYS = ['dailyTotal', 'breakerTotal', 'quizTotal', 'capitalsTotal', 'moviesTotal', 'flagsTotal', 'motusTotal', 'higherTotal', 'queensTotal', 'tangoTotal', 'pinpointTotal', 'sudokuTotal', 'demineurTotal', 'snakeTotal', 'farmTotal', 'questTotal', 'achTotal', 'rakebackTotal', 'vipupTotal', 'vipfreeTotal', 'jackpotTotal'];

export function globalNumbers(players) {
  const sum = (f) => players.reduce((a, p) => a + (f(p) || 0), 0);
  const best = players.reduce((b, p) => ((p.stats.biggestWin || 0) > (b ? b.v : 0) ? { v: p.stats.biggestWin, pseudo: p.pseudo, uid: p.uid, game: p.stats.biggestWinGame } : b), null);
  const games = GAMES.map((g) => {
    const rows = players.map((p) => ({ p, x: (p.stats.games && p.stats.games[g.k]) || {} }));
    const fan = rows.filter((r) => r.x.wagered > 0).sort((a, b) => b.x.wagered - a.x.wagered)[0];
    return { ...g, wagered: rows.reduce((a, r) => a + (r.x.wagered || 0), 0), won: rows.reduce((a, r) => a + (r.x.won || 0), 0), rounds: rows.reduce((a, r) => a + (r.x.rounds || 0), 0), players: rows.filter((r) => r.x.rounds > 0).length, fan: fan ? fan.p : null };
  });
  return {
    players: players.length,
    wagered: sum((p) => p.stats.totalWagered), won: sum((p) => p.stats.totalWon), rounds: sum((p) => p.stats.rounds),
    balance: sum((p) => p.balance), free: sum((p) => FREE_KEYS.reduce((a, k) => a + (p.stats[k] || 0), 0)),
    shop: sum((p) => p.stats.shopSpent), farmSpent: sum((p) => p.stats.farmSpent), jackpots: sum((p) => p.stats.jackpotTotal), ach: sum((p) => Object.keys((p.ach && p.ach.u) || {}).length),
    transfers: sum((p) => p.stats.transfersSent), best, games,
  };
}

export function mount(view, { wallet, backend }) {
  let alive = true, tab = 'me', players = null, loading = false;
  try { if (localStorage.getItem('chibouk_stats_tab') === 'casino') tab = 'casino'; } catch {}

  view.innerHTML = `
    <div class="game-head"><h1>St<span>ats</span></h1><div class="actions"><span class="seg st-tabs"><button data-t="me">Mes stats</button><button data-t="casino">Le casino</button></span></div></div>
    <div id="st-body"></div>
    <p class="muted stats-more">Les classements (semaine, soldes, meilleurs gains par jeu) sont sur la page <a href="#/ranking">Classements</a>.</p>`;
  $$('.st-tabs button', view).forEach((b) => (b.onclick = () => { tab = b.dataset.t; try { localStorage.setItem('chibouk_stats_tab', tab); } catch {} render(); }));

  function render() {
    if (!alive) return;
    $$('.st-tabs button', view).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    const box = $('#st-body', view);
    if (tab === 'me') { box.innerHTML = personalHTML(); return; }
    box.innerHTML = `<div class="panel"><h2><span class="h-ic">${icon('chart')}Le Casino Chibouk en chiffres</span><button class="btn btn-ghost btn-sm" id="glob-refresh">Actualiser</button></h2>
      <div id="glob" class="glob-grid"><p class="muted">Chargement…</p></div></div>
      <div class="panel"><h2>Par jeu, tous joueurs confondus</h2><div id="glob-games"><p class="muted">Chargement…</p></div></div>`;
    $('#glob-refresh', view).onclick = () => load(true);
    if (players) renderGlobal(); else load(false);
  }

  async function load(force) {
    if (loading) return;
    if (force && playersFresh()) toast(`Chiffres déjà à jour (cache de ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min)`);
    loading = true;
    try { players = await getPlayers(backend, wallet, false); }
    catch (e) { console.error(e); const b = $('#glob', view); if (alive && b) b.innerHTML = `<p class="neg">Impossible de charger les chiffres (${esc(e.message)}).</p>`; return; }
    finally { loading = false; }
    if (alive && tab === 'casino') renderGlobal();
  }

  function personalHTML() {
    const s = wallet.stats;
    const LV = ['facile', 'moyen', 'difficile'], bt = (x) => (x ? fmtTime(x) : '—'), pl = (n, w) => `${fmt(n || 0)} ${w}${(n || 0) > 1 ? 's' : ''}`;
    const net = s.totalWon - s.totalWagered;
    const maxW = Math.max(1, ...GAMES.map((g) => Math.max(s.games[g.k].wagered, s.games[g.k].won)));
    return `
    <div class="stats-grid">
      <div class="stat-card hl"><span>Solde actuel</span><b>${money(wallet.balance)}</b><small>Record : ${fmt(s.peakBalance)}</small></div>
      <div class="stat-card"><span>Total misé (wager)</span><b>${money(s.totalWagered)}</b><small>${fmt(s.rounds)} parties jouées</small></div>
      <div class="stat-card"><span>Total gagné</span><b>${money(s.totalWon)}</b><small>Redistribution : ${pct(s.totalWon, s.totalWagered)}</small></div>
      <div class="stat-card"><span>Bilan des jeux</span><b>${signed(net)}</b><small>gagné − misé</small></div>
      <div class="stat-card"><span>Plus gros gain</span><b>${money(s.biggestWin)}</b><small>${s.biggestWinGame ? GAME_LABEL[s.biggestWinGame] || '' : '—'}</small></div>
      <div class="stat-card"><span>Roue du jour</span><b>${fmt(s.dailyClaims)} tours</b><small>${fmt(s.dailyTotal)} ${CONFIG.CURRENCY} reçus · série : ${fmt((wallet.p.streak && wallet.p.streak.n) || 0)} j (record ${fmt((wallet.p.streak && wallet.p.streak.best) || 0)})</small></div>
      <div class="stat-card"><span>Quêtes du jour</span><b>${fmt(s.questsDone || 0)} terminées</b><small>${fmt(s.questTotal || 0)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>VIP & jackpot</span><b>${vipBadge(wallet.p)}</b><small>Multi gratuit ${xMult(vipOf(s.totalWagered).mult)} · bonus VIP sur les gains gratuits : ${fmt(s.vipfreeTotal || 0)} · rakeback : ${fmt(s.rakebackTotal || 0)} · bonus de rang : ${fmt(s.vipupTotal || 0)} · jackpots : ${fmt(s.jackpotTotal || 0)} · boutique : −${fmt(s.shopSpent || 0)}</small></div>
      <div class="stat-card"><span>Casse-briques</span><b>${fmt(s.breakerLevels)} niveaux</b><small>${fmt(s.breakerTotal)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>Calcul mental</span><b>${fmt(s.quizCorrect || 0)} bonnes rép.</b><small>${fmt(s.quizRounds || 0)} parties · ${fmt(s.quizTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.quizPerfect || 0)} sans-faute${s.quizHardCorrect ? ` · difficile : ${fmt(s.quizHardCorrect)} bonnes rép., ${fmt(s.quizHardPerfect || 0)} sans-faute` : ''}</small></div>
      <div class="stat-card"><span>Quiz capitales</span><b>${fmt(s.capitalsCorrect || 0)} bonnes rép.</b><small>${fmt(s.capitalsRounds || 0)} parties · ${fmt(s.capitalsTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.capitalsPerfect || 0)} sans-faute${s.capitalsExpertCorrect ? ` · expert : ${fmt(s.capitalsExpertCorrect)} bonnes rép., ${fmt(s.capitalsExpertPerfect || 0)} sans-faute` : ''}</small></div>
      <div class="stat-card"><span>Quiz drapeaux</span><b>${fmt(s.flagsCorrect || 0)} bonnes rép.</b><small>${fmt(s.flagsRounds || 0)} parties · ${fmt(s.flagsTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.flagsPerfect || 0)} sans-faute</small></div>
      <div class="stat-card"><span>Mot du jour</span><b>${fmt(s.motusWon || 0)} trouvés</b><small>${fmt(s.motusRounds || 0)} parties · ${fmt(s.motusTotal || 0)} ${CONFIG.CURRENCY} · série ${fmt(s.motusStreak || 0)} (record ${fmt(s.motusBestStreak || 0)})</small></div>
      <div class="stat-card"><span>Plus ou moins</span><b>Record : ${fmt(s.higherBest || 0)}</b><small>${fmt(s.higherRounds || 0)} parties · ${fmt(s.higherTotal || 0)} ${CONFIG.CURRENCY} gagnés</small></div>
      <div class="stat-card"><span>Quiz ciné</span><b>${fmt(s.moviesCorrect || 0)} bonnes rép.</b><small>${fmt(s.moviesRounds || 0)} parties · ${fmt(s.moviesTotal || 0)} ${CONFIG.CURRENCY} gagnés · ${fmt(s.moviesPerfect || 0)} sans-faute</small></div>
      <div class="stat-card"><span>Queens</span><b>${pl(s.queensWon, 'grille')}</b><small>${fmt(s.queensTotal || 0)} ${CONFIG.CURRENCY} · records : ${[7, 8, 9].map((n) => `${n}×${n} ${bt(s['queensBest' + n])}`).join(', ')}</small></div>
      <div class="stat-card"><span>Tango</span><b>${pl(s.tangoWon, 'grille')}</b><small>${fmt(s.tangoTotal || 0)} ${CONFIG.CURRENCY} · records : ${LV.map((l, i) => `${l} ${bt(s['tangoBest' + i])}`).join(', ')}</small></div>
      <div class="stat-card"><span>Pinpoint</span><b>${pl(s.pinpointWon, 'trouvée')}</b><small>${pl(s.pinpointRounds, 'partie')} · ${fmt(s.pinpointClue1 || 0)} dès le 1er indice · ${fmt(s.pinpointTotal || 0)} ${CONFIG.CURRENCY}</small></div>
      <div class="stat-card"><span>Sudoku</span><b>${pl(s.sudokuWon, 'grille')}</b><small>${fmt(s.sudokuTotal || 0)} ${CONFIG.CURRENCY} · records : ${LV.map((l, i) => `${l} ${bt(s['sudokuBest' + i])}`).join(', ')}</small></div>
      <div class="stat-card"><span>Démineur</span><b>${fmt(s.demineurWon || 0)} / ${fmt(s.demineurRounds || 0)} gagnées</b><small>${fmt(s.demineurTotal || 0)} ${CONFIG.CURRENCY} · records : ${LV.map((l, i) => `${l} ${bt(s['demineurBest' + i])}`).join(', ')}</small></div>
      <div class="stat-card"><span>Snake</span><b>${pl(s.snakeBananas, 'banane')}</b><small>${pl(s.snakeRounds, 'partie')} · ${fmt(s.snakeTotal || 0)} ${CONFIG.CURRENCY} · records : ${LV.map((l, i) => `${l} ${fmt(s['snakeBest' + i] || 0)}`).join(', ')}</small></div>
      <div class="stat-card"><span>Ferme à bananes</span><b>${hasFarm(wallet.p) ? `${fmt(Math.round(productionPerHour(wallet.p.farm)))} /h` : 'pas encore'}</b><small>${hasFarm(wallet.p) ? `${fmt(Math.floor(wallet.p.farm.tot || 0))} bananes récoltées · ${fmt(wallet.p.farm.sold || 0)} vendues · +${fmt(s.farmTotal || 0)} ${CONFIG.CURRENCY} · −${fmt(s.farmSpent || 0)} dépensés à la ferme${wallet.p.farm.seeds ? ` · ${wallet.p.farm.seeds} graines d'or` : ''}` : '<a href="#/farm">Découvrir la ferme</a>'}</small></div>
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
`;
  }


  function renderGlobal() {
    const box = $('#glob', view), gbox = $('#glob-games', view);
    if (!box || !players) return;
    const g = globalNumbers(players);
    const net = g.won - g.wagered;
    box.innerHTML = `
      <div class="glob hl"><span>Misé par tout le monde</span><b>${money(g.wagered)}</b><small>${fmt(g.rounds)} parties jouées</small></div>
      <div class="glob"><span>Gagné aux jeux</span><b>${money(g.won)}</b><small>RTP réel du casino : ${pct(g.won, g.wagered)}</small></div>
      <div class="glob"><span>Bilan des joueurs</span><b>${signed(net)}</b><small>${net >= 0 ? 'Le casino est dans le rouge, bravo les singes !' : 'Le casino mène… pour l\'instant.'}</small></div>
      <div class="glob"><span>Brundles en circulation</span><b>${money(g.balance)}</b><small>${fmt(g.players)} joueur${g.players > 1 ? 's' : ''} inscrit${g.players > 1 ? 's' : ''}</small></div>
      <div class="glob"><span>Distribués gratuitement</span><b>${money(g.free)}</b><small>roue, quiz, quêtes, succès, rakeback, jackpots…</small></div>
      <div class="glob"><span>Dépensés en boutique</span><b>${money(g.shop)}</b><small>À la ferme : ${fmt(g.farmSpent)} · envoyés entre joueurs : ${fmt(g.transfers)}</small></div>
      <div class="glob"><span>Plus gros gain de l'histoire</span><b>${g.best ? money(g.best.v) : '—'}</b><small>${g.best ? `par <button type="button" class="pl-link" data-player="${g.best.uid}">${esc(g.best.pseudo)}</button> ${GAME_LABEL[g.best.game] || ''}` : ''}</small></div>
      <div class="glob"><span>Succès débloqués</span><b>${fmt(g.ach)}</b><small>Jackpots versés : ${fmt(g.jackpots)}</small></div>`;
    const maxW = Math.max(1, ...g.games.map((x) => x.wagered));
    gbox.innerHTML = `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Jeu</th><th>Volume</th><th class="r">Misé</th><th class="r">Gagné</th><th class="r">RTP réel</th><th class="r">Parties</th><th class="r">Joueurs</th><th>Plus gros parieur</th></tr></thead><tbody>
      ${[...g.games].sort((a, b) => b.wagered - a.wagered).map((x) => `<tr><td>${gname(x)}</td><td class="vol"><div class="bar-track"><div class="bar-fill" style="width:${(x.wagered / maxW) * 100}%"></div></div></td><td class="r">${fmt(x.wagered)}</td><td class="r">${fmt(x.won)}</td><td class="r">${pct(x.won, x.wagered)}</td><td class="r">${fmt(x.rounds)}</td><td class="r">${x.players}</td><td>${x.fan ? `<button type="button" class="pl-link" data-player="${x.fan.uid}">${avatarHTML(x.fan, 'av-xs')}${esc(x.fan.pseudo)}</button>` : '—'}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  render();
  return () => { alive = false; };
}
