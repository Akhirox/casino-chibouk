// Classement affiché à côté de chaque jeu : plus gros parieurs (volume), meilleur multiplicateur, plus gros gain
import { getPlayers } from './players.js';
import { icon, coinSVG } from './art.js';
import { $, $$, fmt, esc } from './ui.js';

const TABS = {
  volume: { label: 'Volume', title: 'Plus gros parieurs', val: (g) => g.wagered || 0, fmt: (v) => fmt(v) },
  mult: { label: 'Multi', title: 'Meilleur multiplicateur', val: (g) => g.bestMult || 0, fmt: (v) => '×' + (v >= 1000 ? fmt(v) : v.toFixed(2).replace('.', ',')) },
  gain: { label: 'Gain', title: 'Plus gros gain', val: (g) => g.biggestWin || 0, fmt: (v) => fmt(v) },
};

export function mountBoard(el, game, title, { wallet, backend }) {
  let alive = true;
  let tab = 'volume';
  try { const t = localStorage.getItem('chibouk_board_tab'); if (TABS[t]) tab = t; } catch {}
  let players = null;
  let timer = null;

  el.innerHTML = `<div class="gb">
    <div class="gb-head">${icon('trophy')}<span>Classement ${esc(title)}</span></div>
    <div class="seg gb-tabs">${Object.entries(TABS).map(([k, t]) => `<button data-t="${k}">${t.label}</button>`).join('')}</div>
    <div class="gb-sub"></div>
    <ol class="gb-list"><li class="muted">Chargement…</li></ol>
    <div class="gb-me"></div>
  </div>`;

  $$('.gb-tabs button', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; try { localStorage.setItem('chibouk_board_tab', tab); } catch {} render(); }));

  function render() {
    if (!alive) return;
    $$('.gb-tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    const T = TABS[tab];
    $('.gb-sub', el).textContent = T.title;
    if (!players) return;
    // ses propres stats sont toujours à jour en local
    const rows = players.map((p) => (p.uid === wallet.uid ? { ...p, stats: wallet.stats, pseudo: wallet.pseudo } : p))
      .map((p) => ({ uid: p.uid, pseudo: p.pseudo, v: T.val((p.stats.games && p.stats.games[game]) || {}) }))
      .filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const top = rows.slice(0, 5);
    $('.gb-list', el).innerHTML = top.length
      ? top.map((x, i) => `<li class="${x.uid === wallet.uid ? 'me' : ''}"><span class="rank r${i + 1}">${i + 1}</span><span class="gb-name">${esc(x.pseudo)}</span><b>${T.fmt(x.v)}${tab === 'mult' ? '' : coinSVG('coin coin-inline')}</b></li>`).join('')
      : '<li class="muted gb-empty">Personne pour l\'instant. À toi de jouer !</li>';
    const myIdx = rows.findIndex((x) => x.uid === wallet.uid);
    $('.gb-me', el).innerHTML = myIdx >= 5 ? `Toi : <b>#${myIdx + 1}</b> · ${T.fmt(rows[myIdx].v)}` : '';
  }

  async function load() {
    try { players = await getPlayers(backend, wallet); } catch (e) { if (alive) $('.gb-list', el).innerHTML = '<li class="muted">Classement indisponible</li>'; return; }
    render();
  }

  // ses propres chiffres bougent en direct (sans lecture en base), au plus toutes les 1,5 s
  const off = wallet.on(() => { if (!timer) timer = setTimeout(() => { timer = null; render(); }, 1500); });
  // la liste des autres joueurs se rafraîchit quand le cache expire
  const refresh = setInterval(load, 130000);

  render();
  load();
  return () => { alive = false; off(); clearTimeout(timer); clearInterval(refresh); };
}
