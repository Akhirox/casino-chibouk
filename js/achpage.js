// Page des succès
import { ACHIEVEMENTS, TIERS, CATEGORIES, achSummary } from './achievements.js';
import { icon } from './art.js';
import { $, $$, fmt, esc } from './ui.js';

const CAT_ICON = { global: 'trophy', slots: 'slots', blackjack: 'blackjack', roulette: 'roulette', plinko: 'plinko', crash: 'crash', tower: 'tower', mines: 'mines', dice: 'dice', free: 'gift' };
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function mount(view, { wallet }) {
  let alive = true, filter = 'all', hideDone = false, timer = null;
  try { filter = localStorage.getItem('chibouk_ach_filter') || 'all'; hideDone = localStorage.getItem('chibouk_ach_hide') === '1'; } catch {}

  view.innerHTML = `
    <div class="game-head"><h1>Mes <span>succès</span></h1></div>
    <section class="ach-top">
      <div class="ach-sum"></div>
      <div class="ach-tiers">${Object.entries(TIERS).map(([k, t]) => `<span class="tier-badge t-${k}">${t.name} · +${fmt(t.reward)}</span>`).join('')}</div>
    </section>
    <div class="ach-filters">
      <div class="seg ach-tabs">${[['all', 'Tous'], ...Object.entries(CATEGORIES)].map(([k, n]) => `<button data-f="${k}">${k === 'all' ? '' : icon(CAT_ICON[k])}${n}</button>`).join('')}</div>
      <label class="ach-hide"><input type="checkbox" id="ach-hide"> Masquer les succès débloqués</label>
    </div>
    <div class="ach-grid" id="ach-grid"></div>`;

  const grid = $('#ach-grid', view);
  $('#ach-hide', view).checked = hideDone;
  $('#ach-hide', view).onchange = (e) => { hideDone = e.target.checked; try { localStorage.setItem('chibouk_ach_hide', hideDone ? '1' : '0'); } catch {} render(); };
  $$('.ach-tabs button', view).forEach((b) => (b.onclick = () => { filter = b.dataset.f; try { localStorage.setItem('chibouk_ach_filter', filter); } catch {} render(); }));

  function render() {
    if (!alive) return;
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
    list = [...list].sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0) || prog(b) - prog(a));
    grid.innerHTML = list.map((a) => {
      const at = u[a.id];
      let bar = '';
      if (!at && a.progress) {
        try { const [x, y] = a.progress(wallet, c); bar = `<div class="ach-prog"><i style="width:${Math.min(100, (x / y) * 100)}%"></i></div><small class="muted">${fmt(Math.min(x, y))} / ${fmt(y)}</small>`; } catch {}
      }
      return `<div class="ach-card ${at ? 'done' : ''} t-${a.tier}">
        <div class="ach-ic">${icon(at ? 'check' : CAT_ICON[a.cat])}</div>
        <div class="ach-txt"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>${bar}
          <div class="ach-meta"><span class="tier-badge t-${a.tier}">${TIERS[a.tier].name} · +${fmt(TIERS[a.tier].reward)}</span>${at ? `<span class="ach-date">Débloqué le ${dateFmt.format(new Date(at))}</span>` : `<span class="ach-cat">${CATEGORIES[a.cat]}</span>`}</div></div>
      </div>`;
    }).join('') || '<p class="muted">Tout est débloqué ici, bravo !</p>';
  }

  const off = wallet.on(() => { if (!timer) timer = setTimeout(() => { timer = null; render(); }, 800); });
  render();
  return () => { alive = false; off(); clearTimeout(timer); };
}
