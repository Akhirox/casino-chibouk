// Détail des boosts empilés (récolte de la ferme, vente des bananes, mini-jeux, défis) : comme le cumul est dégressif
// et que chaque boost a sa propre fin, on montre la suite des multiplicateurs : « ×5 encore 20 min, puis ×4,5 pendant 1 h… »
import { modal, esc } from './ui.js';

const xf = (m) => '×' + String(Math.round(m * 100) / 100).replace('.', ',');
export function durTxt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return `${d} j ${h % 24} h`;
  if (h) return `${h} h ${String(m % 60).padStart(2, '0')}`;
  return `${m} min`;
}
const clock = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayClock = (t, now) => (new Date(t).toDateString() === new Date(now).toDateString() ? clock(t) : `${new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} ${clock(t)}`);

// list = [{ m, u (fin) }], stack(ms) = multiplicateur total. Renvoie [{ m, from, to }] (paliers successifs)
export function boostTimeline(list, stack, now = Date.now()) {
  const live = list.filter((b) => b.u > now && b.m > 1);
  const ends = [...new Set(live.map((b) => b.u))].sort((a, b) => a - b);
  const out = [];
  let t = now;
  for (const e of ends) {
    const m = stack(live.filter((b) => b.u > t).map((b) => b.m));
    if (out.length && out[out.length - 1].m === m) out[out.length - 1].to = e; else out.push({ m, from: t, to: e });
    t = e;
  }
  return out;
}

export function boostDetailHTML(list, stack, { cap = 0, now = Date.now() } = {}) {
  const tl = boostTimeline(list, stack, now);
  if (!tl.length) return '<p class="muted">Aucun boost en cours.</p>';
  const live = list.filter((b) => b.u > now && b.m > 1).sort((a, b) => b.m - a.m || a.u - b.u);
  return `<ol class="bd-tl">${tl.map((p, i) => `<li class="${i ? '' : 'now'}"><b>${xf(p.m)}</b><span>${i ? `puis pendant ${durTxt(p.to - p.from)}` : `maintenant, encore ${durTxt(p.to - now)}`}</span><small>jusqu'à ${dayClock(p.to, now)}</small></li>`).join('')}
      <li class="end"><b>×1</b><span>plus de boost</span><small>à partir de ${dayClock(tl[tl.length - 1].to, now)}</small></li></ol>
    <h4 class="bd-h">Tes boosts (${live.length})</h4>
    <ul class="bd-list">${live.map((b) => `<li><b>${xf(b.m)}</b><span>se termine dans ${durTxt(b.u - now)}</span><small>${dayClock(b.u, now)}</small></li>`).join('')}</ul>
    <p class="muted bd-note">Les boosts se cumulent de façon dégressive : le plus fort compte en entier, le 2e pour moitié, le 3e pour un tiers…${cap ? ` Plafond : ${xf(cap)}.` : ''} Quand un boost se termine, le total baisse : c'est pour ça que le multiplicateur change par paliers.</p>`;
}

export function openBoostDetail(title, list, stack, opts = {}) {
  return modal({ title: esc(title), html: `<div class="bd">${boostDetailHTML(list, stack, opts)}</div>`, buttons: [{ label: 'Fermer', value: true, primary: true }] });
}
