// Classements : chiffres de tout le casino, classement de la semaine + palmarès, soldes, meilleures wins par jeu
import { CONFIG } from './config.js';
import { $, $$, fmt, money, esc, toast } from './ui.js';
import { icon } from './art.js';
import { getPlayers, playersFresh } from './players.js';
import { avatarHTML } from './profile.js';
import { titleHTML } from './shop.js';
import { vipBadge } from './progress.js';
import { weekId, prevWeekId } from './wallet.js';
import { weeklyRows, getWeeks, syncWeeks } from './weekly.js';
import { GAMES, GAME_LABEL, gname, pct, signed } from './stats.js';

// Brundles distribués hors jeux (bonus, quiz, succès…), pour les chiffres globaux
const FREE_KEYS = ['dailyTotal', 'breakerTotal', 'quizTotal', 'capitalsTotal', 'moviesTotal', 'flagsTotal', 'motusTotal', 'higherTotal', 'questTotal', 'achTotal', 'rakebackTotal', 'vipupTotal', 'jackpotTotal'];

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
    shop: sum((p) => p.stats.shopSpent), jackpots: sum((p) => p.stats.jackpotTotal), ach: sum((p) => Object.keys((p.ach && p.ach.u) || {}).length),
    transfers: sum((p) => p.stats.transfersSent), best, games,
  };
}

export function mount(view, { wallet, backend }) {
  let alive = true, wkTab = 'cur', players = null;
  view.innerHTML = `
    <div class="game-head"><h1>Classe<span>ments</span></h1><div class="actions"><button class="btn btn-ghost btn-sm" id="lb-refresh">Actualiser</button></div></div>
    <div class="panel"><h2><span class="h-ic">${icon('chart')}Le Casino Chibouk en chiffres</span></h2>
      <div id="glob" class="glob-grid"><p class="muted">Chargement…</p></div>
      <div id="glob-games"></div>
    </div>
    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement de la semaine</span><span class="seg wk-tabs"><button data-w="cur" class="on">Cette semaine</button><button data-w="prev">Semaine dernière</button></span></h2>
      <p class="muted wk-note">Bénéfice aux jeux de casino (gagné − misé) du lundi au dimanche. Le premier gagne un trophée permanent, affiché sur son profil.</p>
      <div id="wk"><p class="muted">Chargement…</p></div>
      <h3 class="wk-h">Palmarès</h3><div id="wk-hall" class="wk-hall"></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement des singes (soldes)</span></h2>
      <div id="lb"><p class="muted">Chargement…</p></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('medal')}Meilleures wins par jeu</span></h2>
      <div id="bw" class="bw-grid"><p class="muted">Chargement…</p></div>
      <p class="muted" style="font-size:.78rem;margin:12px 0 0">Plus gros gain encaissé en une seule partie. Les données des autres joueurs sont mises à jour toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s environ, et la liste est gardée en cache ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min pour économiser la base de données.</p>
    </div>`;
  $('#lb-refresh', view).onclick = () => loadLB(true);
  $$('.wk-tabs button', view).forEach((b) => (b.onclick = () => { wkTab = b.dataset.w; $$('.wk-tabs button', view).forEach((x) => x.classList.toggle('on', x === b)); renderWeek(); }));

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
      <div class="glob"><span>Dépensés en boutique</span><b>${money(g.shop)}</b><small>Envoyés entre joueurs : ${fmt(g.transfers)}</small></div>
      <div class="glob"><span>Plus gros gain de l'histoire</span><b>${g.best ? money(g.best.v) : '—'}</b><small>${g.best ? `par <button type="button" class="pl-link" data-player="${g.best.uid}">${esc(g.best.pseudo)}</button> ${GAME_LABEL[g.best.game] || ''}` : ''}</small></div>
      <div class="glob"><span>Succès débloqués</span><b>${fmt(g.ach)}</b><small>Jackpots versés : ${fmt(g.jackpots)}</small></div>`;
    const maxW = Math.max(1, ...g.games.map((x) => x.wagered));
    gbox.innerHTML = `<h3 class="wk-h">Par jeu, tous joueurs confondus</h3><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Jeu</th><th>Volume</th><th class="r">Misé</th><th class="r">Gagné</th><th class="r">RTP réel</th><th class="r">Parties</th><th class="r">Joueurs</th><th>Plus gros parieur</th></tr></thead><tbody>
      ${[...g.games].sort((a, b) => b.wagered - a.wagered).map((x) => `<tr><td>${gname(x)}</td><td class="vol"><div class="bar-track"><div class="bar-fill" style="width:${(x.wagered / maxW) * 100}%"></div></div></td><td class="r">${fmt(x.wagered)}</td><td class="r">${fmt(x.won)}</td><td class="r">${pct(x.won, x.wagered)}</td><td class="r">${fmt(x.rounds)}</td><td class="r">${x.players}</td><td>${x.fan ? `<button type="button" class="pl-link" data-player="${x.fan.uid}">${avatarHTML(x.fan, 'av-xs')}${esc(x.fan.pseudo)}</button>` : '—'}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

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
    renderGlobal();
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


  loadLB(false);
  return () => { alive = false; };
}
