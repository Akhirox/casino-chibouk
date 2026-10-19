// Page des succès (+ fenêtre « qui l'a débloqué » au clic sur un succès)
import { ACHIEVEMENTS, TIERS, CATEGORIES, achSummary } from './achievements.js';
import { icon } from './art.js';
import { $, $$, fmt, esc, modal } from './ui.js';
import { getPlayers } from './players.js';
import { CONFIG } from './config.js';
import { avatarHTML } from './profile.js';

const CAT_ICON = { global: 'trophy', slots: 'slots', jungle: 'jungle', blackjack: 'blackjack', roulette: 'roulette', plinko: 'plinko', crash: 'crash', tower: 'tower', mines: 'mines', dice: 'dice', hilo: 'hilo', keno: 'keno', wheel: 'wheel', limbo: 'limbo', scratch: 'scratch', free: 'gift', farm: 'banana', progress: 'star' };
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: CONFIG.TIMEZONE });

// Pour chaque succès : liste des joueurs qui l'ont, triée du premier au dernier
export function holdersById(players) {
  const map = {};
  for (const p of players) {
    const u = (p.ach && p.ach.u) || {};
    for (const [id, at] of Object.entries(u)) (map[id] = map[id] || []).push({ uid: p.uid, pseudo: p.pseudo, avatar: p.avatar, at: +at || 0 });
  }
  for (const list of Object.values(map)) list.sort((a, b) => a.at - b.at || String(a.pseudo).localeCompare(String(b.pseudo)));
  return map;
}

export function mount(view, { wallet, backend }) {
  let alive = true, filter = 'all', hideDone = false, timer = null, sort = 'default';
  let players = null, holders = {};
  try { filter = localStorage.getItem('chibouk_ach_filter') || 'all'; hideDone = localStorage.getItem('chibouk_ach_hide') === '1'; sort = localStorage.getItem('chibouk_ach_sort') || 'default'; } catch {}

  view.innerHTML = `
    <div class="game-head"><h1>Mes <span>succès</span></h1></div>
    <section class="ach-top">
      <div class="ach-sum"></div>
      <div class="ach-tiers">${Object.entries(TIERS).map(([k, t]) => `<span class="tier-badge t-${k}">${t.name} · +${fmt(t.reward)}</span>`).join('')}</div>
    </section>
    <div class="ach-filters">
      <div class="seg ach-tabs">${[['all', 'Tous'], ...Object.entries(CATEGORIES)].map(([k, n]) => `<button data-f="${k}">${k === 'all' ? '' : icon(CAT_ICON[k])}${n}</button>`).join('')}</div>
      <div class="ach-tools">
        <label class="ach-sort">Trier <select id="ach-sort">
          <option value="default">Par défaut (débloqués, puis les plus avancés)</option>
          <option value="mine">Mes derniers obtenus</option>
          <option value="recent">Derniers obtenus par tout le monde</option>
          <option value="rare">Les plus rares</option>
          <option value="common">Les plus courants</option>
        </select></label>
        <label class="ach-hide"><input type="checkbox" id="ach-hide"> Masquer les succès débloqués</label>
      </div>
    </div>
    <p class="muted ach-hint">Clique sur un succès pour voir qui l'a débloqué, et qui l'a eu en premier.</p>
    <div class="ach-grid" id="ach-grid"></div>`;

  const grid = $('#ach-grid', view);
  $('#ach-hide', view).checked = hideDone;
  $('#ach-sort', view).value = sort;
  $('#ach-sort', view).onchange = (e) => { sort = e.target.value; try { localStorage.setItem('chibouk_ach_sort', sort); } catch {} render(); };
  $('#ach-hide', view).onchange = (e) => { hideDone = e.target.checked; try { localStorage.setItem('chibouk_ach_hide', hideDone ? '1' : '0'); } catch {} render(); };
  $$('.ach-tabs button', view).forEach((b) => (b.onclick = () => { filter = b.dataset.f; try { localStorage.setItem('chibouk_ach_filter', filter); } catch {} render(); }));
  grid.addEventListener('click', (e) => { const c = e.target.closest('.ach-card'); if (c) openDetail(c.dataset.id); });
  grid.addEventListener('keydown', (e) => { const c = e.target.closest('.ach-card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(c.dataset.id); } });

  async function loadPlayers(force = false) {
    try {
      players = await getPlayers(backend, wallet, force);
      holders = holdersById(players);
    } catch (e) { console.error(e); }
    return players;
  }

  // ses propres succès viennent toujours de l'état local (à jour à la seconde)
  function refreshHolders() {
    if (players) holders = holdersById(players.map((p) => (p.uid === wallet.uid ? { ...p, ach: wallet.p.ach, avatar: wallet.p.avatar } : p)));
  }

  function render() {
    if (!alive) return;
    refreshHolders();
    const u = (wallet.p.ach && wallet.p.ach.u) || {};
    const c = (wallet.p.ach && wallet.p.ach.c) || {};
    const { done, total } = achSummary(wallet);
    const earned = wallet.stats.achTotal || 0;
    $('.ach-sum', view).innerHTML = `<div class="ach-count"><b>${done}</b>/${total}<span>succès débloqués</span></div>
      <div class="ach-bar"><i style="width:${(done / total) * 100}%"></i></div>
      <div class="muted">${fmt(earned)} Brundles gagnés grâce aux succès</div>`;
    $$('.ach-tabs button', view).forEach((b) => {
      b.classList.toggle('on', b.dataset.f === filter);
      const list = b.dataset.f === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.cat === b.dataset.f);
      b.dataset.count = `${list.filter((a) => u[a.id]).length}/${list.length}`;
    });
    let list = filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.cat === filter);
    if (hideDone) list = list.filter((a) => !u[a.id]);
    // débloqués d'abord (les plus récents), puis les plus avancés
    const prog = (a) => { if (!a.progress) return 0; try { const [x, y] = a.progress(wallet, c); return Math.min(1, x / y); } catch { return 0; } };
    const nPlayers = players ? Math.max(1, players.length) : 1;
    const share = (a) => ((holders[a.id] || []).length / nPlayers);
    const lastAt = (a) => { const hs = holders[a.id] || []; return hs.length ? hs[hs.length - 1].at : 0; };
    const byDefault = (a, b) => (u[b.id] || 0) - (u[a.id] || 0) || prog(b) - prog(a);
    const sorters = {
      default: byDefault,
      mine: (a, b) => (u[b.id] || 0) - (u[a.id] || 0) || byDefault(a, b),
      recent: (a, b) => lastAt(b) - lastAt(a) || byDefault(a, b),
      rare: (a, b) => share(a) - share(b) || Object.keys(TIERS).indexOf(b.tier) - Object.keys(TIERS).indexOf(a.tier),
      common: (a, b) => share(b) - share(a) || byDefault(a, b),
    };
    list = [...list].sort(sorters[sort] || byDefault);
    if (sort === 'recent') list = list.filter((a) => lastAt(a) > 0).concat(list.filter((a) => !lastAt(a)));
    grid.innerHTML = list.map((a) => {
      const at = u[a.id];
      let bar = '';
      if (!at && a.progress) {
        try { const [x, y] = a.progress(wallet, c); bar = `<div class="ach-prog"><i style="width:${Math.min(100, (x / y) * 100)}%"></i></div><small class="muted">${fmt(Math.min(x, y))} / ${fmt(y)}</small>`; } catch {}
      }
      const hs = holders[a.id] || [];
      const first = hs[0] && hs[0].uid === wallet.uid;
      const rate = players ? Math.round((hs.length / nPlayers) * 100) : 0;
      const last = hs.length ? hs[hs.length - 1] : null;
      const who = players ? `<span class="ach-who ${first ? 'first' : ''} ${hs.length && rate <= 10 ? 'rare' : ''}" title="${first ? 'Tu l\'as débloqué en premier !' : ''}">${first ? icon('trophy') : ''}${hs.length ? `${hs.length} joueur${hs.length > 1 ? 's' : ''} · ${rate} %` : 'Personne'}</span>` : '';
      const lastLine = sort === 'recent' && last ? `<small class="ach-last">Dernier : <b>${esc(last.pseudo)}</b> le ${dateFmt.format(new Date(last.at))}</small>` : '';
      return `<div class="ach-card ${at ? 'done' : ''} t-${a.tier}" data-id="${a.id}" tabindex="0" role="button" aria-label="${esc(a.name)} : voir qui l'a débloqué">
        <div class="ach-ic">${icon(at ? 'check' : CAT_ICON[a.cat])}</div>
        <div class="ach-txt"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>${bar}
          ${lastLine}<div class="ach-meta"><span class="tier-badge t-${a.tier}">${TIERS[a.tier].name} · +${fmt(TIERS[a.tier].reward)}</span>${at ? `<span class="ach-date">Débloqué le ${dateFmt.format(new Date(at))}</span>` : `<span class="ach-cat">${CATEGORIES[a.cat]}</span>`}${who}</div></div>
      </div>`;
    }).join('') || '<p class="muted">Tout est débloqué ici, bravo !</p>';
  }

  function detailHTML(a) {
    const hs = holders[a.id] || [];
    const n = players ? players.length : 0;
    const head = `<div class="achd-head t-${a.tier}"><div class="ach-ic">${icon(CAT_ICON[a.cat])}</div>
      <div><p>${esc(a.desc)}</p><span class="tier-badge t-${a.tier}">${TIERS[a.tier].name} · +${fmt(TIERS[a.tier].reward)}</span> <span class="ach-cat">${CATEGORIES[a.cat]}</span></div></div>`;
    if (!players) return head + '<p class="muted">Impossible de charger la liste des joueurs pour le moment.</p>';
    if (!hs.length) return head + `<div class="achd-none">Personne ne l'a encore débloqué.<br><b>Sois le premier !</b></div>`;
    const f = hs[0];
    return head + `
      <div class="achd-first">${avatarHTML(f, 'av-md')}<div><small>Premier à le débloquer</small><b>${esc(f.pseudo)}${f.uid === wallet.uid ? ' (toi)' : ''}</b><span>${f.at ? 'le ' + dateTimeFmt.format(new Date(f.at)) : 'date inconnue'}</span></div></div>
      <div class="achd-stat">${hs.length} joueur${hs.length > 1 ? 's' : ''} sur ${n} (${Math.round((hs.length / Math.max(1, n)) * 100)} %)</div>
      <ol class="achd-list">${hs.map((x, i) => `<li class="${x.uid === wallet.uid ? 'me' : ''}"><span class="r">${i + 1}</span><b>${avatarHTML(x, 'av-xs')}${esc(x.pseudo)}</b><small>${x.at ? dateTimeFmt.format(new Date(x.at)) : '—'}</small></li>`).join('')}</ol>
      <p class="muted achd-note">Les succès des autres joueurs apparaissent environ ${CONFIG.SYNC_INTERVAL_MS / 1000} s après leur déblocage (liste gardée en cache ${CONFIG.LEADERBOARD_CACHE_MS / 60000} min).</p>`;
  }

  async function openDetail(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    await loadPlayers();
    if (!alive) return;
    refreshHolders();
    modal({ title: esc(a.name), cls: 'ach-detail', html: detailHTML(a), buttons: [{ label: 'Fermer', value: true, primary: true }] });
  }

  const off = wallet.on(() => { if (!timer) timer = setTimeout(() => { timer = null; render(); }, 800); });
  render();
  loadPlayers().then(() => alive && render());
  return () => { alive = false; off(); clearTimeout(timer); };
}
