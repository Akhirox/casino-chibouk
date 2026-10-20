// Quiz géographie — jeu gratuit : un pays est demandé, clique dessus sur la carte du monde. 10 questions.
// Carte zoomable (molette, pincement, boutons) et déplaçable ; les tout petits pays ont un point cliquable.
import { CONFIG } from '../config.js';
import { GEO, GEO_W, GEO_H, GEO_LAND } from './geo-data.js';
import { mountMCQ, pickDistinct } from './mcq.js';

// [code, nom, niveau, x, y, taille, tracé]
export const COUNTRIES = GEO.map(([c, n, l, x, y, a, d]) => ({ c, n, l, x, y, a, d }));
const byCode = new Map(COUNTRIES.map((k) => [k.c, k]));
const TINY = 9; // en dessous (px de la carte), le pays a aussi un point cliquable

export function buildGeo(list, n = 10, mode = 'easy') {
  const max = mode === 'easy' ? 1 : mode === 'medium' ? 2 : 3;
  const pool = list.filter((k) => k.l <= max);
  // en difficile, au moins la moitié des questions sur des pays « experts »
  const hard = mode === 'hard' ? pickDistinct(pool.filter((k) => k.l === 3), 6) : [];
  const rest = pickDistinct(pool.filter((k) => !hard.includes(k)), n - hard.length);
  return pickDistinct([...hard, ...rest], n).map((k) => ({ type: 'map', label: 'Clique sur ce pays', big: k.n, answer: k.c, right: k.n }));
}

// Carte : un seul SVG, réutilisé d'une question à l'autre
function createMap() {
  const NS = 'http://www.w3.org/2000/svg';
  const wrap = document.createElement('div');
  wrap.className = 'geo-map';
  wrap.innerHTML = `<svg viewBox="0 0 ${GEO_W} ${GEO_H}" preserveAspectRatio="xMidYMid meet" aria-label="Carte du monde">
      <rect class="geo-sea" x="-5000" y="-5000" width="${GEO_W + 10000}" height="${GEO_H + 10000}"/>
      <path class="geo-land" d="${GEO_LAND}"/>
      <g class="geo-countries">${COUNTRIES.map((k) => `<path data-c="${k.c}" d="${k.d}"/>`).join('')}</g>
      <g class="geo-dots">${COUNTRIES.filter((k) => k.a < TINY).map((k) => `<circle data-c="${k.c}" cx="${k.x}" cy="${k.y}" r="6"/>`).join('')}</g>
    </svg>
    <div class="geo-zoom"><button type="button" data-z="in" aria-label="Zoomer">+</button><button type="button" data-z="out" aria-label="Dézoomer">−</button><button type="button" data-z="reset" aria-label="Vue entière">⤢</button></div>
    <div class="geo-hover" hidden></div>`;
  const svg = wrap.querySelector('svg'), hover = wrap.querySelector('.geo-hover');
  let vb = { x: 0, y: 0, w: GEO_W, h: GEO_H };
  const apply = () => {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const k = vb.w / GEO_W;
    svg.style.setProperty('--sw', (0.8 * k).toFixed(3));
    svg.querySelectorAll('.geo-dots circle').forEach((c) => c.setAttribute('r', Math.max(1.2, 7 * k).toFixed(2)));
  };
  const clamp = () => {
    vb.w = Math.min(GEO_W, Math.max(GEO_W / 24, vb.w)); vb.h = vb.w * GEO_H / GEO_W;
    vb.x = Math.min(GEO_W - vb.w * 0.5, Math.max(-vb.w * 0.5, vb.x)); vb.y = Math.min(GEO_H - vb.h * 0.5, Math.max(-vb.h * 0.5, vb.y));
  };
  const toMap = (cx, cy) => { const r = svg.getBoundingClientRect(); const s = Math.max(vb.w / r.width, vb.h / r.height); const ox = (r.width * s - vb.w) / 2, oy = (r.height * s - vb.h) / 2; return { x: vb.x + (cx - r.left) * s - ox, y: vb.y + (cy - r.top) * s - oy, s }; };
  function zoomAt(f, cx, cy) {
    const p = cx === undefined ? { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 } : toMap(cx, cy);
    const nw = Math.min(GEO_W, Math.max(GEO_W / 24, vb.w / f)), k = nw / vb.w;
    vb.x = p.x - (p.x - vb.x) * k; vb.y = p.y - (p.y - vb.y) * k; vb.w = nw; vb.h = nw * GEO_H / GEO_W;
    clamp(); apply();
  }
  function focus(code, f = 4) {
    const k = byCode.get(code); if (!k) return;
    const nw = Math.min(vb.w, GEO_W / f);
    vb = { x: k.x - nw / 2, y: k.y - (nw * GEO_H / GEO_W) / 2, w: nw, h: nw * GEO_H / GEO_W };
    clamp(); apply();
  }
  // glisser pour déplacer, pincer pour zoomer ; un clic sans déplacement choisit le pays
  const pts = new Map(); let drag = null, moved = 0, pinch = 0, onPick = null, locked = false;
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; drag = { x: e.clientX, y: e.clientY }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) {
      const t = e.target.closest && e.target.closest('[data-c]');
      // nom du pays survolé : seulement une fois la réponse donnée (sinon trop facile)
      if (locked && t) { hover.hidden = false; hover.textContent = (byCode.get(t.dataset.c) || {}).n || ''; } else hover.hidden = true;
      return;
    }
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch = d; moved += 10; return; }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y; moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4) { const s = toMap(0, 0).s; vb.x -= dx * s; vb.y -= dy * s; clamp(); apply(); }
  });
  const up = (e) => {
    const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
    if (!was || moved > 6 || pts.size || locked || !onPick) return;
    // pays sous le doigt, sinon le petit pays dont le point est le plus proche (tolérance de 14 px à l'écran)
    let t = document.elementFromPoint(e.clientX, e.clientY); t = t && t.closest ? t.closest('[data-c]') : null;
    let code = t && t.dataset.c;
    if (!code) {
      const p = toMap(e.clientX, e.clientY); let best = null, bd = 14 * p.s;
      COUNTRIES.filter((k) => k.a < 20).forEach((k) => { const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; best = k.c; } });
      code = best;
    }
    if (code) onPick(code);
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = 0; });
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });
  svg.addEventListener('pointerleave', () => (hover.hidden = true));
  wrap.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { if (b.dataset.z === 'reset') { vb = { x: 0, y: 0, w: GEO_W, h: GEO_H }; apply(); } else zoomAt(b.dataset.z === 'in' ? 1.6 : 0.625); }));
  apply();
  return {
    el: wrap,
    start(cb) { onPick = cb; locked = false; hover.hidden = true; vb = { x: 0, y: 0, w: GEO_W, h: GEO_H }; apply(); svg.querySelectorAll('.good,.bad,.hint').forEach((x) => x.classList.remove('good', 'bad', 'hint')); wrap.classList.remove('locked'); },
    reveal(target, picked) {
      locked = true; wrap.classList.add('locked');
      if (picked && picked !== target) svg.querySelectorAll(`[data-c="${picked}"]`).forEach((x) => x.classList.add('bad'));
      svg.querySelectorAll(`[data-c="${target}"]`).forEach((x) => { x.classList.add('good'); x.parentNode.appendChild(x); });
      const k = byCode.get(target);
      // si le pays est hors de la vue ou minuscule, on recentre dessus
      if (k && (k.x < vb.x || k.x > vb.x + vb.w || k.y < vb.y || k.y > vb.y + vb.h || (k.a < 30 && vb.w > GEO_W / 3))) focus(target, k.a < 30 ? 6 : 2.5);
    },
  };
}

export function mount(view, ctx) {
  let map = null;
  const getMap = () => (map ||= createMap());
  return mountMCQ(view, ctx, {
    kind: 'geo',
    title: 'Quiz <span>géographie</span>',
    introTitle: (m) => `10 pays à trouver sur la carte, ${m.seconds} secondes chacun`,
    introText: `Un pays est demandé : clique dessus sur la carte du monde (${COUNTRIES.length} pays). Zoome avec la molette, en pinçant ou avec les boutons, et fais glisser la carte pour te déplacer.`,
    seconds: 20,
    modes: [
      { key: 'easy', label: 'Facile', desc: 'Les grands pays et les plus connus.', seconds: 20, perCorrect: 15, perfectBonus: 75, stat: 'Easy' },
      { key: 'medium', label: 'Moyen', desc: 'Les pays classiques du monde entier.', seconds: 20, perCorrect: 25, perfectBonus: 125, stat: 'Medium' },
      { key: 'hard', label: 'Difficile', desc: 'Tous les pays, petits États compris.', seconds: 25, perCorrect: 40, perfectBonus: 200, stat: 'Hard' },
    ],
    load: async () => COUNTRIES,
    build: buildGeo,
    map: {
      show(el, q, cb) { const m = getMap(); el.append(m.el); m.start(cb); },
      reveal(q, picked) { getMap().reveal(q.answer, picked); },
      nameOf: (code) => (byCode.get(code) || {}).n || 'un autre pays',
    },
  });
}
export const GEO_COUNT = COUNTRIES.length;
