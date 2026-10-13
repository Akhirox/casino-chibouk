// Suivi de balance : graphique des gains/pertes depuis le lancement du suivi
// - part de 0 au lancement, ne compte que les jeux (pas le bonus quotidien ni les transferts)
// - continue quand on change de jeu ou qu'on recharge la page, jusqu'au reset
import { icon } from './art.js';
import { h, $, fmt } from './ui.js';

const MAX_POINTS = 400;
const MERGE_MS = 350; // une mise et son gain quasi simultanés ne font qu'un point

export function createTracker(wallet, toggleBtn) {
  const key = 'chibouk_tracker_' + wallet.uid;
  let st = load();
  let panel = null;

  function fresh() { return { active: true, open: true, net: 0, wagered: 0, rounds: 0, max: 0, min: 0, points: [{ t: Date.now(), v: 0 }], lastAt: 0 }; }
  function load() { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  function save() { try { localStorage.setItem(key, JSON.stringify(st)); } catch {} }

  function record(delta, isBet) {
    if (!st || !st.active || !delta) return;
    st.net += delta;
    if (isBet) { st.wagered += -delta; st.rounds++; }
    st.max = Math.max(st.max, st.net); st.min = Math.min(st.min, st.net);
    const now = Date.now();
    const last = st.points[st.points.length - 1];
    if (st.points.length > 1 && now - st.lastAt < MERGE_MS) last.v = st.net;
    else st.points.push({ t: now, v: st.net });
    st.lastAt = now;
    if (st.points.length > MAX_POINTS) st.points = st.points.filter((_, i) => i === 0 || i % 2 === 1 || i === st.points.length - 1);
    save();
    if (panel) render();
  }

  const off = wallet.on((evt) => {
    if (!evt) return;
    if (evt.type === 'bet') record(-evt.amount, true);
    else if (evt.type === 'win' || evt.type === 'breaker') record(evt.amount, false);
    else if (evt.type === 'refund') { record(evt.amount, false); if (st && st.active) { st.wagered = Math.max(0, st.wagered - evt.amount); st.rounds = Math.max(0, st.rounds - 1); save(); } }
  });

  function open() {
    if (!st || !st.active) st = fresh();
    st.open = true; save();
    if (!panel) build();
    render();
    toggleBtn.classList.add('on');
    toggleBtn.classList.remove('active-bg');
    document.body.classList.add('tk-open');
  }
  function close() {
    if (st) { st.open = false; save(); }
    if (panel) { panel.remove(); panel = null; }
    toggleBtn.classList.remove('on');
    document.body.classList.remove('tk-open');
    toggleBtn.classList.toggle('active-bg', !!(st && st.active));
  }
  function reset() { st = fresh(); save(); render(); }
  function stop() { st = null; try { localStorage.removeItem(key); } catch {} close(); }

  function build() {
    panel = h(`<div class="tracker" role="region" aria-label="Suivi de balance">
      <div class="tk-head"><span class="tk-title">${icon('chart')}Suivi de session</span>
        <div class="tk-actions">
          <button class="tk-btn" data-a="reset" title="Remettre à zéro">${icon('reset')}</button>
          <button class="tk-btn" data-a="min" title="Réduire">${icon('close')}</button>
        </div></div>
      <div class="tk-net"></div>
      <svg class="tk-chart" viewBox="0 0 300 120" preserveAspectRatio="none"></svg>
      <div class="tk-foot"><span>Misé <b class="tk-w"></b></span><span>Haut <b class="tk-max pos"></b></span><span>Bas <b class="tk-min neg"></b></span></div>
      <button class="tk-stop">Arrêter le suivi</button>
    </div>`);
    panel.querySelector('[data-a="reset"]').onclick = reset;
    panel.querySelector('[data-a="min"]').onclick = close;
    panel.querySelector('.tk-stop').onclick = stop;
    document.body.append(panel);
  }

  function render() {
    if (!panel || !st) return;
    const net = st.net;
    const netEl = $('.tk-net', panel);
    netEl.textContent = (net > 0 ? '+' : '') + fmt(net);
    netEl.className = 'tk-net ' + (net > 0 ? 'pos' : net < 0 ? 'neg' : '');
    $('.tk-w', panel).textContent = fmt(st.wagered);
    $('.tk-max', panel).textContent = '+' + fmt(st.max);
    $('.tk-min', panel).textContent = fmt(st.min);
    // graphique
    const W = 300, H = 120, P = 6;
    const pts = st.points;
    const lo = Math.min(0, ...pts.map((p) => p.v)), hi = Math.max(0, ...pts.map((p) => p.v));
    const span = hi - lo || 1;
    const x = (i) => P + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - 2 * P));
    const y = (v) => P + (1 - (v - lo) / span) * (H - 2 * P);
    const y0 = y(0);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(pts.length - 1).toFixed(1)} ${y0.toFixed(1)} L${x(0).toFixed(1)} ${y0.toFixed(1)} Z`;
    const off0 = Math.max(0, Math.min(1, y0 / H));
    $('.tk-chart', panel).innerHTML = `
      <defs>
        <linearGradient id="tkStroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">
          <stop offset="${off0}" stop-color="#3ddc84"/><stop offset="${off0}" stop-color="#ff4d5e"/></linearGradient>
        <linearGradient id="tkFill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">
          <stop offset="0" stop-color="#3ddc84" stop-opacity=".35"/><stop offset="${off0}" stop-color="#3ddc84" stop-opacity=".05"/>
          <stop offset="${off0}" stop-color="#ff4d5e" stop-opacity=".05"/><stop offset="1" stop-color="#ff4d5e" stop-opacity=".35"/></linearGradient>
      </defs>
      <line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
      <path d="${area}" fill="url(#tkFill)"/>
      <path d="${line}" fill="none" stroke="url(#tkStroke)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(pts.length - 1)}" cy="${y(net)}" r="3.5" fill="${net >= 0 ? '#3ddc84' : '#ff4d5e'}"/>`;
  }

  toggleBtn.onclick = () => (panel ? close() : open());
  if (st && st.active && st.open) open();
  else if (st && st.active) toggleBtn.classList.add('active-bg');

  return { destroy() { off(); if (panel) panel.remove(); panel = null; document.body.classList.remove('tk-open'); } };
}
