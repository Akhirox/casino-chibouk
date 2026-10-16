// Classements : classement de la semaine + palmarès, soldes, meilleures wins par jeu (les chiffres du casino sont dans stats.js)
import { CONFIG } from './config.js';
import { $, $$, fmt, money, esc, toast } from './ui.js';
import { icon } from './art.js';
import { getPlayers, playersFresh } from './players.js';
import { avatarHTML } from './profile.js';
import { titleHTML } from './shop.js';
import { vipBadge } from './progress.js';
import { weekId, prevWeekId } from './wallet.js';
import { weeklyRows, getWeeks, syncWeeks } from './weekly.js';
import { GAMES, signed } from './stats.js';
import { hasFarm, snapshot, visit } from './farm.js';
import { productionPerHour } from './farm-core.js';

export function mount(view, { wallet, backend }) {
  let alive = true, wkTab = 'cur', players = null;
  view.innerHTML = `
    <div class="game-head"><h1>Classe<span>ments</span></h1><div class="actions"><button class="btn btn-ghost btn-sm" id="lb-refresh">Actualiser</button></div></div>
    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement de la semaine</span><span class="seg wk-tabs"><button data-w="cur" class="on">Cette semaine</button><button data-w="prev">Semaine dernière</button></span></h2>
      <p class="muted wk-note">Bénéfice aux jeux de casino (gagné − misé) du lundi au dimanche. Le premier gagne un trophée permanent, affiché sur son profil.</p>
      <div id="wk"><p class="muted">Chargement…</p></div>
      <h3 class="wk-h">Palmarès</h3><div id="wk-hall" class="wk-hall"></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('banana')}Les plus belles fermes</span><a class="btn btn-ghost btn-sm" href="#/farm">Ma ferme</a></h2>
      <div id="farms"><p class="muted">Chargement…</p></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('trophy')}Classement des singes (fortune)</span></h2>
      <div id="lb"><p class="muted">Chargement…</p></div>
    </div>

    <div class="panel"><h2><span class="h-ic">${icon('medal')}Meilleures wins par jeu</span></h2>
      <div id="bw" class="bw-grid"><p class="muted">Chargement…</p></div>
      <p class="muted" style="font-size:.78rem;margin:12px 0 0">Plus gros gain encaissé en une seule partie. Les données des autres joueurs sont mises à jour toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s environ, et la liste est gardée en cache ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min pour économiser la base de données.</p>
    </div>`;
  $('#lb-refresh', view).onclick = () => loadLB(true);
  $$('.wk-tabs button', view).forEach((b) => (b.onclick = () => { wkTab = b.dataset.w; $$('.wk-tabs button', view).forEach((x) => x.classList.toggle('on', x === b)); renderWeek(); }));

  async function loadLB(force) {
    const box = $('#lb', view), bw = $('#bw', view);
    if (force && playersFresh(true)) toast('Classement déjà à jour (relu il y a moins d\'une minute)');
    try { players = await getPlayers(backend, wallet, !!force); }
    catch (e) {
      console.error(e);
      if (alive && box) box.innerHTML = `<p class="neg">Impossible de charger le classement (${esc(e.message)}).</p>`;
      if (alive && bw) bw.innerHTML = '';
      return;
    }
    if (!alive || !box) return;
    renderWeek();
    renderFarms();
    syncWeeks(backend, wallet).then(() => alive && renderHall());
    const fort = (r) => r.balance + Math.max(0, r.vault || 0);
    const rows = [...players].sort((a, b) => fort(b) - fort(a)).slice(0, CONFIG.LEADERBOARD_SIZE);
    box.innerHTML = `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Joueur</th><th class="r">Fortune</th><th class="r">Total misé</th><th class="r">Plus gros gain</th><th class="r">Bilan jeux</th><th class="r">Succès</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.uid}">${avatarHTML(r.uid === wallet.uid ? { ...r, avatar: wallet.p.avatar } : r, 'av-sm')}${esc(r.pseudo)}${r.uid === wallet.uid ? ' (toi)' : ''}</button> ${vipBadge(r)}${titleHTML(r)}</td>
      <td class="r"><b>${fmt(fort(r))}</b>${r.vault ? `<small class="muted lb-vault" title="dont au coffre">${fmt(r.vault)} au coffre</small>` : ''}</td><td class="r">${fmt(r.stats.totalWagered)}</td><td class="r">${fmt(r.stats.biggestWin)}</td><td class="r">${signed(r.stats.totalWon - r.stats.totalWagered)}</td><td class="r">${r.uid === wallet.uid ? Object.keys((wallet.p.ach && wallet.p.ach.u) || {}).length : Object.keys((r.ach && r.ach.u) || {}).length}</td></tr>`).join('')}
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

  function renderFarms() {
    const box = $('#farms', view);
    if (!box || !players) return;
    const rows = players.filter(hasFarm).map((p) => { const s = snapshot(p.farm); return { p, s, rate: productionPerHour(s) }; }).sort((a, b) => b.rate - a.rate).slice(0, 10);
    box.innerHTML = rows.length ? `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Fermier</th><th class="r">Production</th><th class="r">Parcelles</th><th class="r">Singes</th><th class="r">Vendues</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.p.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.p.uid}">${avatarHTML(r.p, 'av-sm')}${esc(r.p.pseudo)}</button></td><td class="r"><b>${fmt(Math.round(r.rate))}</b> /h</td><td class="r">${r.s.own.length}</td><td class="r">${r.s.w}</td><td class="r">${fmt(r.s.sold || 0)}</td><td><button class="btn btn-ghost btn-sm" data-visit="${r.p.uid}">Visiter</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Personne n\'a encore de ferme. <a href="#/farm">Sois le premier !</a></p>';
    $$('[data-visit]', box).forEach((b) => (b.onclick = () => { const r = rows.find((x) => x.p.uid === b.dataset.visit); if (r) visit(r.p); }));
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
