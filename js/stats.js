// Statistiques personnelles + classement (lu avec parcimonie pour économiser les lectures Firestore)
import { CONFIG } from './config.js';
import { $, fmt, money, esc, toast } from './ui.js';
import { icon } from './art.js';
import { getPlayers, playersFresh } from './players.js';
import { avatarHTML } from './profile.js';
import { titleHTML } from './shop.js';
import { vipBadge } from './progress.js';
import { weekId, prevWeekId } from './wallet.js';
import { weeklyRows, getWeeks, syncWeeks } from './weekly.js';

const GAMES = [
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
const GAME_LABEL = { slots: 'à la machine à sous', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue du Singe', limbo: 'au Limbo' };
const gname = (g) => `<span class="gname">${icon(g.k)}${g.name}</span>`;
const pct = (a, b) => (b ? (a / b * 100).toFixed(1).replace('.', ',') + ' %' : '—');
const signed = (n) => `<span class="${n >= 0 ? 'pos' : 'neg'}">${n >= 0 ? '+' : ''}${fmt(n)}</span>`;

export function mount(view, { wallet, backend }) {
  let alive = true, wkTab = 'cur', players = null;
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
      <div class="stat-card"><span>VIP & jackpot</span><b>${vipBadge(wallet.p)}</b><small>Remboursements : ${fmt(s.cashbackTotal || 0)} · jackpots : ${fmt(s.jackpotTotal || 0)} · boutique : −${fmt(s.shopSpent || 0)}</small></div>
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

    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement de la semaine</span><span class="seg wk-tabs"><button data-w="cur" class="on">Cette semaine</button><button data-w="prev">Semaine dernière</button></span></h2>
      <p class="muted wk-note">Bénéfice aux jeux de casino (gagné − misé) du lundi au dimanche. Le premier gagne un trophée permanent, affiché sur son profil.</p>
      <div id="wk"><p class="muted">Chargement…</p></div>
      <h3 class="wk-h">Palmarès</h3><div id="wk-hall" class="wk-hall"></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement des singes</span> <button class="btn btn-ghost btn-sm" id="lb-refresh">Actualiser</button></h2>
      <div id="lb"><p class="muted">Chargement…</p></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('medal')}Meilleures wins par jeu</span></h2>
      <div id="bw" class="bw-grid"><p class="muted">Chargement…</p></div>
      <p class="muted" style="font-size:.78rem;margin:12px 0 0">Plus gros gain encaissé en une seule partie. Les données des autres joueurs sont mises à jour toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s environ, et la liste est gardée en cache ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min pour économiser la base de données.</p>
    </div>`;
    $('#lb-refresh', view).onclick = () => loadLB(true);
    view.querySelectorAll('.wk-tabs button').forEach((b) => (b.onclick = () => { wkTab = b.dataset.w; view.querySelectorAll('.wk-tabs button').forEach((x) => x.classList.toggle('on', x === b)); renderWeek(); }));
    loadLB(false);
  };

  async function loadLB(force) {
    const box = $('#lb', view), bw = $('#bw', view);
    if (force && playersFresh()) toast(`Classement déjà à jour (cache de ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min)`);
    try { players = await getPlayers(backend, wallet, false); }
    catch (e) {
      console.error(e);
      if (alive && box) box.innerHTML = `<p class="neg">Impossible de charger le classement (${esc(e.message)}).</p>`;
      if (alive && bw) bw.innerHTML = '';
      return;
    }
    if (!alive || !box) return;
    renderWeek();
    syncWeeks(backend, wallet).then(() => alive && renderHall());
    const rows = [...players].sort((a, b) => b.balance - a.balance).slice(0, CONFIG.LEADERBOARD_SIZE);
    box.innerHTML = `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Joueur</th><th class="r">Solde</th><th class="r">Total misé</th><th class="r">Plus gros gain</th><th class="r">Bilan jeux</th><th class="r">Succès</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.uid}">${avatarHTML(r.uid === wallet.uid ? { ...r, avatar: wallet.p.avatar } : r, 'av-sm')}${esc(r.pseudo)}${r.uid === wallet.uid ? ' (toi)' : ''}</button> ${vipBadge(r)}${titleHTML(r)}</td>
      <td class="r"><b>${fmt(r.balance)}</b></td><td class="r">${fmt(r.stats.totalWagered)}</td><td class="r">${fmt(r.stats.biggestWin)}</td><td class="r">${signed(r.stats.totalWon - r.stats.totalWagered)}</td><td class="r">${r.uid === wallet.uid ? Object.keys((wallet.p.ach && wallet.p.ach.u) || {}).length : Object.keys((r.ach && r.ach.u) || {}).length}</td></tr>`).join('')}
      </tbody></table></div>`;
    // Top 3 des plus gros gains, jeu par jeu
    bw.innerHTML = GAMES.map((g) => {
      const top = players.map((p) => ({ uid: p.uid, pseudo: p.pseudo, avatar: p.avatar, shop: p.shop, v: (p.stats.games[g.k] && p.stats.games[g.k].biggestWin) || 0 }))
        .filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
      return `<div class="bw-card"><div class="bw-head">${icon(g.k)}<b>${g.name}</b></div>
        ${top.length ? `<ol>${top.map((x, i) => `<li class="${x.uid === wallet.uid ? 'me' : ''}"><span class="rank r${i + 1}">${i + 1}</span><button type="button" class="bw-name pl-link" data-player="${x.uid}">${avatarHTML(x, 'av-xs')}${esc(x.pseudo)}</button><b>${money(x.v)}</b></li>`).join('')}</ol>`
        : '<p class="muted bw-empty">Personne n\'a encore gagné ici</p>'}</div>`;
    }).join('');
  }

  // Classement de la semaine (en cours ou précédente)
  function renderWeek() {
    const box = $('#wk', view);
    if (!box || !players) return;
    const W = wkTab === 'cur' ? weekId() : prevWeekId();
    const rows = weeklyRows(players, W);
    box.innerHTML = rows.length ? `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Joueur</th><th class="r">Bénéfice</th><th class="r">Misé cette semaine</th></tr></thead><tbody>
      ${rows.slice(0, CONFIG.LEADERBOARD_SIZE).map((r, i) => `<tr class="${r.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.uid}">${avatarHTML(r, 'av-sm')}${esc(r.pseudo)}</button></td><td class="r"><b>${signed(Math.round(r.profit))}</b></td><td class="r">${fmt(r.wagered)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Personne n\'a encore joué aux jeux de casino cette semaine-là.</p>';
  }
  function renderHall() {
    const box = $('#wk-hall', view);
    if (!box) return;
    const list = getWeeks().slice(0, 12);
    box.innerHTML = list.length ? list.map((w) => `<div class="wk-item"><small>${w.id.replace('-W', ' · semaine ')}</small><b>${icon('trophy')}${esc(w.winnerPseudo)}</b>${signed(w.profit)}${(w.top || []).slice(1).map((t, i) => `<small class="muted">${i + 2}. ${esc(t.pseudo)} (${t.profit >= 0 ? '+' : ''}${fmt(t.profit)})</small>`).join('')}</div>`).join('')
      : '<p class="muted">Le premier trophée sera décerné lundi, à la fin de la semaine en cours.</p>';
  }

  render();
  return () => { alive = false; };
}
