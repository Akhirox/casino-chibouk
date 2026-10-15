// Ferme à bananes : page, tuiles dessinées, marché, fermes des voisins, et minuterie globale (chantiers, stock plein).
import * as F from './farm-core.js';
import { $, $$, fmt, money, esc, toast, modal, coinRain, CUR } from './ui.js';
import { icon } from './art.js';
import { sfx } from './sfx.js';
import { getPlayers } from './players.js';
import { avatarHTML } from './profile.js';

/* ------------------------------ outils ------------------------------ */
export const BANANA = '<svg viewBox="0 0 24 24" class="ban" aria-hidden="true"><path d="M4.2 5.6C4.4 12.6 9.6 18.6 16.2 18.6c2.4 0 4.3-.8 5.6-2.2-1.9.3-3.8.2-5.6-.4C11.4 14.4 7.8 10.6 6.8 5.4z" fill="#ffd23f" stroke="#b88600" stroke-width="1" stroke-linejoin="round"/><path d="M6.6 8.6c1.4 4 4.4 7 8.4 8.2" stroke="#e0aa00" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M4.3 5.8 3.6 3.4l2.8-.3.4 2.3z" fill="#7a5a2a"/><path d="M21.8 16.4l.9.6" stroke="#5a3a1a" stroke-width="1.6" stroke-linecap="round"/></svg>';
export const SEED = '<svg viewBox="0 0 24 24" class="seed" aria-hidden="true"><path d="M12 3c4.5 3 6.5 7 6 11-.4 3.6-3 6.5-6 7-3-.5-5.6-3.4-6-7-.5-4 1.5-8 6-11z" fill="#f5c542" stroke="#b88600" stroke-width="1.2"/><path d="M12 7c-1.4 3-1.6 7 0 11" stroke="#fff6" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
export const ban = (n) => `<span class="bn">${fmt(Math.floor(n))}${BANANA}</span>`;
export function dur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return `${d} j ${h % 24} h`;
  if (h) return `${h} h ${String(m % 60).padStart(2, '0')}`;
  return `${m} min${s % 60 && m < 10 ? ` ${s % 60} s` : ''}`;
}
export const hasFarm = (p) => !!(p && p.farm && p.farm.v);
// Copie à jour d'une ferme (la sienne ou celle d'un voisin) sans toucher à l'original
export function snapshot(raw, now = Date.now()) { const f = F.normalize(JSON.parse(JSON.stringify(raw || {})), now); F.tick(f, now); return f; }
const MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000];

/* ------------------------------ dessins des tuiles ------------------------------ */
function tree(x, y, s, L) {
  const bunch = L >= 8 ? '#ffc400' : '#ffd23f';
  const n = Math.min(4, 1 + Math.floor(L / 3));
  let b = '';
  for (let k = 0; k < n; k++) b += `<ellipse cx="${x - 3 + (k % 2) * 6}" cy="${y + 2 + Math.floor(k / 2) * 5}" rx="3.2" ry="5" fill="${bunch}" stroke="#b88600" stroke-width=".6"/>`;
  return `<g transform="translate(0 0) scale(${s})" transform-origin="${x} ${y + 20}">
    <path d="M${x} ${y + 22} C${x - 1} ${y + 12} ${x + 1} ${y + 6} ${x} ${y - 2}" stroke="#7a5a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M${x} ${y - 2} q-16 -6 -22 6 q12 -3 22 -6z M${x} ${y - 2} q16 -6 22 6 q-12 -3 -22 -6z M${x} ${y - 3} q-8 -14 -20 -10 q12 2 20 10z M${x} ${y - 3} q8 -14 20 -10 q-12 2 -20 10z" fill="#2fa866" stroke="#1d7a47" stroke-width=".8"/>
    ${b}</g>`;
}
export function tileArt(t, L) {
  if (t === 'F') {
    const trees = L >= 9 ? [[30, 44, 0.85], [70, 44, 0.85], [50, 58, 1]] : L >= 4 ? [[34, 50, 0.95], [68, 50, 0.95]] : [[50, 46, 1.3]];
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="84" rx="40" ry="9" fill="#00000030"/><path d="M12 78 h76" stroke="#5a3a1a" stroke-width="2" stroke-dasharray="3 5" opacity=".5"/>${trees.map(([x, y, s]) => tree(x, y, s, L)).join('')}</svg>`;
  }
  if (t === 'C') {
    const big = L >= 5;
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="38" ry="8" fill="#00000030"/>
      <rect x="22" y="${big ? 44 : 50}" width="56" height="${big ? 40 : 34}" rx="3" fill="#a06a3a" stroke="#6b4320" stroke-width="2"/>
      <path d="M22 ${big ? 52 : 58} h56 M22 ${big ? 62 : 68} h56 M22 ${big ? 72 : 78} h56" stroke="#7a4e28" stroke-width="1.4"/>
      <path d="M14 ${big ? 48 : 54} L50 ${big ? 18 : 26} L86 ${big ? 48 : 54} z" fill="#d9b25a" stroke="#9a7a2a" stroke-width="2"/>
      <path d="M24 ${big ? 44 : 50} L50 ${big ? 24 : 32} L76 ${big ? 44 : 50}" stroke="#b8902e" stroke-width="1.5" fill="none"/>
      <rect x="43" y="${big ? 64 : 66}" width="14" height="${big ? 20 : 18}" rx="7" fill="#3a2410"/>
      ${big ? '<rect x="28" y="52" width="10" height="9" fill="#ffe08a" stroke="#6b4320"/><rect x="62" y="52" width="10" height="9" fill="#ffe08a" stroke="#6b4320"/>' : ''}</svg>`;
  }
  if (t === 'E') {
    const silo = L >= 5;
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="40" ry="8" fill="#00000030"/>
      ${silo ? '<rect x="70" y="26" width="18" height="58" rx="8" fill="#c0c9d0" stroke="#7d8890" stroke-width="2"/><path d="M70 40h18M70 54h18M70 68h18" stroke="#9aa5ad" stroke-width="1.4"/>' : ''}
      <path d="M14 46 L42 26 L70 46 V84 H14 Z" fill="#c4442e" stroke="#7a2416" stroke-width="2"/>
      <path d="M14 46 L42 26 L70 46" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8"/>
      <rect x="30" y="58" width="24" height="26" fill="#7a2416"/><path d="M30 58 l24 26 M54 58 l-24 26" stroke="#e6a07a" stroke-width="2"/>
      <rect x="4" y="72" width="14" height="12" fill="#c9954a" stroke="#7a5a2a"/><path d="M6 76h10" stroke="#ffd23f" stroke-width="3"/></svg>`;
  }
  if (t === 'P') {
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="34" ry="8" fill="#00000030"/>
      <path d="M30 26 h40 M33 26 V58 M67 26 V58" stroke="#6b4a1a" stroke-width="4" stroke-linecap="round"/>
      <path d="M26 24 L50 12 L74 24 z" fill="#8a5a2a"/>
      <path d="M46 30 v14" stroke="#5a3a1a" stroke-width="1.5"/><rect x="42" y="44" width="8" height="8" rx="1.5" fill="#8fa597"/>
      <ellipse cx="50" cy="60" rx="24" ry="8" fill="#2fb1ff" stroke="#6f7b74" stroke-width="3"/>
      <path d="M26 60 v18 a24 8 0 0 0 48 0 v-18" fill="#8d9a92" stroke="#5f6b64" stroke-width="2"/>
      <path d="M30 68h40M30 76h40" stroke="#6f7b74" stroke-width="1.5"/>${L >= 3 ? '<circle cx="80" cy="40" r="2.5" fill="#7fd1ff"/><circle cx="20" cy="46" r="2" fill="#7fd1ff"/>' : ''}</svg>`;
  }
  if (t === 'M') {
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="40" ry="8" fill="#00000030"/>
      <rect x="18" y="46" width="64" height="36" fill="#9a6a3a" stroke="#5a3a1a" stroke-width="2"/>
      <path d="M12 46 L20 24 H80 L88 46 Z" fill="#f5c542"/>
      ${[0, 1, 2, 3].map((k) => `<path d="M${20 + k * 15} 24 h7.5 L${12 + k * 19 + 9.5} 46 h-9.5 z" fill="#2fa866"/>`).join('')}
      <path d="M12 46 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0" fill="#f5c542" stroke="#c99a00"/>
      <rect x="26" y="58" width="48" height="10" rx="3" fill="#6b4320"/>
      <path d="M30 60 q6 6 12 0 M46 60 q6 6 12 0 M62 60 q6 6 12 0" stroke="#ffd23f" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      ${L >= 5 ? '<circle cx="80" cy="18" r="7" fill="#f5c542" stroke="#c99a00"/><text x="80" y="21.5" text-anchor="middle" font-size="9" font-weight="800" fill="#6b4a00">B</text>' : ''}</svg>`;
  }
  return '';
}

/* ------------------------------ plateau ------------------------------ */
export function boardHTML(f, { sel = -1, readOnly = false, now = Date.now() } = {}) {
  const as = F.assignment(f), workersAt = {};
  as.fields.forEach((x) => (workersAt[x.i] = x));
  const price = F.landPrice(f);
  let h = '';
  for (let i = 0; i < F.SIZE * F.SIZE; i++) {
    const own = f.own.includes(i), x = F.tile(f, i), q = f.q.find((y) => y.i === i);
    let cls = 'fm-tile', inner = '';
    if (!own) {
      const can = !readOnly && F.buyable(f, i);
      cls += can ? ' buy' : ' locked';
      inner = can ? `<span class="fm-buy">${icon('lock')}<small>${fmt(price)}</small></span>` : '';
    } else {
      cls += ' own';
      const shown = x || (q ? { t: q.t, l: q.l } : null);
      if (shown) {
        cls += ' b-' + shown.t + (!x ? ' ghost' : '');
        inner = `<span class="fm-art">${tileArt(shown.t, shown.l)}</span>${x ? `<span class="fm-lv">${x.l}</span>` : ''}`;
        const wa = workersAt[i];
        if (wa) inner += `<span class="fm-wk" title="${wa.w} / ${wa.cap} singes">${Array.from({ length: wa.cap }, (_, k) => `<i class="${k < wa.w ? 'on' : ''}"></i>`).join('')}</span>`;
      } else cls += ' empty';
      if (q) {
        const p = Math.max(0, Math.min(1, (now - q.start) / (q.end - q.start)));
        cls += ' work';
        inner += `<span class="fm-work"><i style="width:${p * 100}%"></i><small data-end="${q.end}">${dur(q.end - now)}</small></span>`;
      }
    }
    if (i === sel) cls += ' sel';
    h += `<button type="button" class="${cls}" data-i="${i}" ${readOnly ? 'tabindex="-1"' : ''}>${inner}</button>`;
  }
  return `<div class="fm-board ${readOnly ? 'ro' : ''}">${h}</div>`;
}

/* ------------------------------ minuterie globale ------------------------------ */
// Fait avancer la ferme toutes les secondes (où qu'on soit sur le site) : chantiers terminés, stock plein, paliers.
export function initFarm(wallet) {
  let fullWarned = false;
  const iv = setInterval(() => {
    const raw = wallet.p.farm;
    if (!raw || !raw.v || !Array.isArray(raw.g)) return;
    const done = F.tick(raw);
    if (done.length) {
      done.forEach((q) => toast(`<b>${F.B[q.t].name}</b> ${q.l === 1 ? 'construite' : `niveau ${q.l}`} !`, 'win', 3500));
      sfx.coin();
      save(wallet, 'done');
      window.dispatchEvent(new CustomEvent('chibouk:farm', { detail: { done } }));
    }
    const cap = F.capacity(raw);
    if (raw.b >= cap - 0.5 && raw.rate > 0) { if (!fullWarned) { fullWarned = true; toast('Ton entrepôt est plein : vends ou dépense des bananes, sinon la récolte s\'arrête !', 'error', 6000); } }
    else if (raw.b < cap * 0.95) fullWarned = false;
    const ms = raw.ms || 0, next = MILESTONES.find((m) => m > ms && raw.rate >= m);
    if (next) { raw.ms = Math.max(...MILESTONES.filter((m) => raw.rate >= m)); save(wallet, 'milestone', { n: raw.ms }); }
  }, 1000);
  return { destroy: () => clearInterval(iv) };
}
function save(wallet, act, extra = {}) { wallet.touch({ type: 'farm', act, ...extra }); }

/* ------------------------------ page ------------------------------ */
export function mount(view, { wallet, backend }) {
  let alive = true, tab = 'me', sel = -1;
  if (!hasFarm(wallet.p) || !Array.isArray(wallet.p.farm.g)) wallet.p.farm = F.normalize(wallet.p.farm);
  const f = () => wallet.p.farm;
  F.tick(f());
  try { if (localStorage.getItem('chibouk_farm_tab') === 'nb') tab = 'nb'; } catch {}

  view.innerHTML = `<div class="fm-wrap">
    <div class="game-head"><h1>Ferme à <span>bananes</span></h1><div class="actions"><span class="seg fm-tabs"><button data-t="me">Ma ferme</button><button data-t="nb">Les voisins</button></span><button class="btn btn-ghost btn-sm fm-helpbtn" id="fm-help" title="Comment ça marche ?"><span class="fm-help-l">Comment ça marche ?</span><span class="fm-help-s">?</span></button></div></div>
    <div id="fm-body"></div></div>`;
  $$('.fm-tabs button', view).forEach((b) => (b.onclick = () => { tab = b.dataset.t; try { localStorage.setItem('chibouk_farm_tab', tab); } catch {} render(); }));
  $('#fm-help', view).onclick = help;

  function render() {
    if (!alive) return;
    $$('.fm-tabs button', view).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    if (tab === 'nb') return neighbors();
    const fm = f();
    $('#fm-body', view).innerHTML = `
      <section class="fm-top">
        <div class="fm-stock"><div class="fm-stock-row"><span class="fm-big">${BANANA}<b id="fm-b"></b></span><small>/ <span id="fm-cap"></span></small></div>
          <div class="fm-bar"><i id="fm-bar"></i></div><small id="fm-full" class="muted"></small></div>
        <div class="fm-kpi"><span>Production</span><b id="fm-rate"></b><small id="fm-value" class="muted"></small><small id="fm-seeds" class="fm-seeds"></small><button class="btn btn-gold btn-sm" id="fm-replant" hidden></button></div>
        <div class="fm-kpi"><span>Singes ouvriers</span><b id="fm-wk"></b><button class="btn btn-ghost btn-sm" id="fm-hire"></button></div>
        <div class="fm-kpi"><span>Bâtisseurs</span><b id="fm-bu"></b>${fm.bu < 3 ? `<button class="btn btn-ghost btn-sm" id="fm-builder">+1 · ${fmt(F.BUILDERS[fm.bu + 1])} ${CUR}</button>` : '<small class="muted">équipe complète</small>'}</div>
        <button class="btn btn-gold fm-sellbtn" id="fm-sell">${BANANA}Marché</button>
      </section>
      <div class="fm-hint" id="fm-hint"></div>
      <div class="fm-main"><div id="fm-board-wrap">${boardHTML(fm, { sel })}</div><aside class="fm-side" id="fm-side"></aside></div>`;
    $('#fm-board-wrap', view).onclick = (e) => { const t = e.target.closest('.fm-tile'); if (!t) return; sel = +t.dataset.i; sfx.click(); refreshBoard(); side(); if (window.innerWidth < 980) $('#fm-side', view).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    $('#fm-hire', view).onclick = () => act(() => F.hire(f()), 'hire', 'Un singe de plus au travail !');
    const bb = $('#fm-builder', view); if (bb) bb.onclick = buyBuilder;
    $('#fm-sell', view).onclick = () => sell('sell');
    $('#fm-replant', view).onclick = replant;
    side(); numbers();
  }

  function refreshBoard() { const w = $('#fm-board-wrap', view); if (w) w.innerHTML = boardHTML(f(), { sel }); }

  // chiffres du haut + barres de chantier (chaque seconde)
  function numbers() {
    if (!alive || tab !== 'me') return;
    const fm = f(), cap = F.capacity(fm), rate = F.productionPerHour(fm);
    const el = (id) => $('#' + id, view);
    if (!el('fm-b')) return;
    el('fm-b').textContent = fmt(Math.floor(fm.b));
    el('fm-cap').textContent = fmt(cap);
    el('fm-bar').style.width = Math.min(100, (fm.b / Math.max(1, cap)) * 100) + '%';
    el('fm-bar').classList.toggle('full', fm.b >= cap - 0.5);
    el('fm-full').textContent = fm.b >= cap - 0.5 ? 'Entrepôt plein : la récolte est à l\'arrêt !' : rate > 0 ? `Plein dans ${dur(((cap - fm.b) / rate) * F.HOUR)}` : 'Aucun singe au travail';
    el('fm-rate').innerHTML = `${fmt(Math.round(rate))} <small>/ h</small>`;
    el('fm-value').textContent = `≈ ${fmt(Math.round(rate * F.sellRate(fm)))} ${CUR}/h à la vente`;
    el('fm-seeds').innerHTML = fm.seeds ? `${SEED} ${fm.seeds} graine${fm.seeds > 1 ? 's' : ''} d'or · +${Math.round(F.SEED_BONUS * fm.seeds * 100)} %` : '';
    const gain = F.seedGain(fm.life), rb = el('fm-replant');
    rb.hidden = gain < F.REPLANT_MIN;
    if (!rb.hidden) rb.innerHTML = `${SEED} Replanter · +${gain}`;
    const hc = F.hireCost(fm.w), H = F.houses(fm);
    el('fm-wk').textContent = `${fm.w} / ${H}`;
    const hb = el('fm-hire');
    hb.innerHTML = fm.w >= H ? 'Cabanes pleines' : `Embaucher · ${ban(hc)}`;
    hb.disabled = fm.w >= H || fm.b < hc;
    el('fm-bu').textContent = `${fm.q.length} / ${fm.bu} au travail`;
    const now = Date.now();
    $$('.fm-work', view).forEach((w) => { const s = w.querySelector('small'), end = +s.dataset.end, q = fm.q.find((y) => y.end === end); if (!q) return; s.textContent = dur(end - now); w.querySelector('i').style.width = Math.min(100, ((now - q.start) / (q.end - q.start)) * 100) + '%'; });
    $$('[data-left]', view).forEach((s) => (s.textContent = dur(+s.dataset.left - now)));
    $$('[data-rush]', view).forEach((b) => { const q = fm.q.find((y) => y.i === +b.dataset.rush); if (q) b.innerHTML = `Terminer maintenant · ${fmt(F.rushCost(q.end - now))} ${CUR}`; });
    hint();
  }

  function hint() {
    const fm = f(), el = $('#fm-hint', view);
    if (!el) return;
    const as = F.assignment(fm), free = F.totalSlots(fm) - Math.min(fm.w, F.houses(fm)), cap = F.capacity(fm);
    const emptyOwned = fm.own.filter((i) => !F.tile(fm, i) && !fm.q.some((q) => q.i === i)).length;
    let t = '';
    if (fm.b >= cap - 0.5) t = 'Entrepôt plein ! Vends des bananes, dépense-les, ou améliore ton entrepôt.';
    else if (free > 0 && fm.w < F.houses(fm)) t = `Il reste ${free} place${free > 1 ? 's' : ''} dans tes bananeraies : embauche des singes !`;
    else if (free > 0) t = 'Tes bananeraies ont des places libres mais tes cabanes sont pleines : améliore ou construis une cabane.';
    else if (as.idle > 0) t = `${as.idle} singe${as.idle > 1 ? 's' : ''} sans travail : améliore une bananeraie (plus de places) ou construis-en une nouvelle.`;
    else if (!emptyOwned && fm.own.length < 49) t = 'Plus de place libre : achète une parcelle voisine (cases avec un cadenas).';
    else if (!fm.q.length) t = 'Tes bâtisseurs se tournent les pouces : lance une construction ou une amélioration !';
    el.innerHTML = t ? `${icon('bulb')}<span>${t}</span>` : '';
    el.hidden = !t;
  }

  /* ---------- panneau de droite ---------- */
  function side() {
    const fm = f(), el = $('#fm-side', view);
    if (!el) return;
    const now = Date.now();
    if (sel < 0) { el.innerHTML = overview(); const rb = $('[data-replant]', el); if (rb) rb.onclick = replant; return; }
    const own = fm.own.includes(sel), x = F.tile(fm, sel), q = fm.q.find((y) => y.i === sel);
    if (!own) {
      if (!F.buyable(fm, sel)) { el.innerHTML = `<h3>Parcelle sauvage</h3><p class="muted">Achète d'abord une parcelle qui touche ta ferme (cases avec un cadenas et un prix).</p>`; return; }
      const p = F.landPrice(fm);
      el.innerHTML = `<h3>Parcelle à vendre</h3><p>Agrandis ta ferme pour y construire de nouveaux bâtiments.</p>
        <p class="fm-price">${money(p)}</p><button class="btn btn-gold wide" id="fm-land" ${wallet.balance < p ? 'disabled' : ''}>Acheter la parcelle</button>
        <p class="muted fm-note">Payée en ${CUR}. Chaque parcelle coûte un peu plus cher que la précédente (${fm.own.length} / ${F.SIZE * F.SIZE}).</p>`;
      $('#fm-land', el).onclick = buyLand;
      return;
    }
    if (q) {
      el.innerHTML = `<h3>${F.B[q.t].name} · ${q.l === 1 ? 'construction' : `vers le niveau ${q.l}`}</h3>
        <p>Fin dans <b data-left="${q.end}">${dur(q.end - now)}</b></p>
        <button class="btn btn-gold wide" data-rush="${sel}">Terminer maintenant · ${fmt(F.rushCost(q.end - now))} ${CUR}</button>
        <p class="muted fm-note">Le bâtiment continue de fonctionner pendant les travaux.</p>${x ? detail(x) : ''}`;
      $('[data-rush]', el).onclick = () => rush(sel);
      return;
    }
    if (!x) { el.innerHTML = buildMenu(); $$('[data-build]', el).forEach((b) => (b.onclick = () => act(() => F.build(f(), sel, b.dataset.build), 'build', `Construction lancée : ${F.B[b.dataset.build].name}`))); return; }
    const d = F.B[x.t], max = x.l >= d.max, cost = max ? 0 : F.costOf(fm, x.t, x.l + 1), err = max ? null : F.canUpgrade(fm, sel);
    el.innerHTML = `<div class="fm-side-head"><span class="fm-side-art">${tileArt(x.t, x.l)}</span><div><h3>${d.name}</h3><span class="tier-badge">Niveau ${x.l} / ${d.max}</span></div></div>
      <p class="muted">${d.desc}</p>${detail(x)}
      ${max ? '<p class="gold">Niveau maximum atteint.</p>' : `<div class="fm-up"><div><small>Amélioration</small><b>${ban(cost)}</b><small>${dur(F.timeOf(x.t, x.l + 1))}</small></div>
        <button class="btn btn-gold" id="fm-up" ${err ? 'disabled' : ''}>Améliorer</button></div>${err ? `<p class="fm-err">${err}${cost > F.capacity(fm) ? ` (il faut un entrepôt de ${fmt(cost)} : capacité actuelle ${fmt(F.capacity(fm))})` : ''}</p>` : ''}`}
      <button class="btn btn-ghost btn-sm fm-demo" id="fm-demo">Démolir</button>`;
    const up = $('#fm-up', el); if (up) up.onclick = () => act(() => F.upgrade(f(), sel), 'upgrade', `Amélioration lancée : ${d.name} niveau ${x.l + 1}`);
    $('#fm-demo', el).onclick = async () => {
      const ok = await modal({ title: 'Démolir ?', html: `<p>Démolir ${d.name.toLowerCase()} niveau ${x.l} ? Les bananes dépensées ne sont pas remboursées.</p>`, buttons: [{ label: 'Annuler', value: false }, { label: 'Démolir', value: true, primary: true }] });
      if (ok) act(() => F.demolish(f(), sel), 'demolish', 'Bâtiment démoli');
    };
  }

  // effet actuel → niveau suivant
  function detail(x) {
    const fm = f(), nx = Math.min(x.l + 1, F.B[x.t].max), same = nx === x.l;
    const row = (label, a, b) => `<li><span>${label}</span><b>${a}${same ? '' : ` <i>→ ${b}</i>`}</b></li>`;
    if (x.t === 'F') {
      const wa = F.assignment(fm).fields.find((y) => y.i === sel);
      const irr = F.irrigation(fm, sel);
      return `<ul class="fm-stats">${row('Par singe', `${fmt(F.perWorker(x.l) * (1 + irr))}/h`, `${fmt(F.perWorker(nx) * (1 + irr))}/h`)}${row('Places', F.slots(x.l), F.slots(nx))}
        <li><span>Singes au travail</span><b>${wa ? wa.w : 0} / ${F.slots(x.l)}</b></li><li><span>Production</span><b>${fmt(wa ? wa.w * wa.per : 0)}/h</b></li>${irr ? `<li><span>Irrigation</span><b>+${Math.round(irr * 100)} %</b></li>` : ''}</ul>`;
    }
    if (x.t === 'C') return `<ul class="fm-stats">${row('Singes logés', F.housing(x.l), F.housing(nx))}</ul>`;
    if (x.t === 'E') return `<ul class="fm-stats">${row('Capacité', fmt(F.storage(x.l)), fmt(F.storage(nx)))}</ul>`;
    if (x.t === 'P') return `<ul class="fm-stats">${row('Bananeraies voisines', `+${Math.round(F.wellBonus(x.l) * 100)} %`, `+${Math.round(F.wellBonus(nx) * 100)} %`)}</ul>`;
    if (x.t === 'M') return `<ul class="fm-stats">${row('Prix de vente', `${(F.SELL_BASE * (1 + 0.1 * x.l)).toFixed(3).replace('.', ',')} ${CUR}`, `${(F.SELL_BASE * (1 + 0.1 * nx)).toFixed(3).replace('.', ',')} ${CUR}`)}</ul>`;
    return '';
  }

  function buildMenu() {
    const fm = f();
    return `<h3>Construire ici</h3><div class="fm-builds">${F.TYPES.map((t) => {
      const d = F.B[t], c = F.costOf(fm, t, 1), err = F.canBuild(fm, sel, t);
      const eff = t === 'F' ? `${fmt(F.perWorker(1))}/h par singe, ${F.slots(1)} places` : t === 'C' ? `${F.housing(1)} singes logés` : t === 'E' ? `+${fmt(F.storage(1))} de stockage` : t === 'P' ? `+${Math.round(F.wellBonus(1) * 100)} % aux bananeraies voisines` : `vente +10 % par niveau`;
      return `<div class="fm-build ${err ? 'off' : ''}"><span class="fm-build-art">${tileArt(t, 1)}</span><div><b>${d.name}</b><small>${eff}</small><small>${ban(c)} · ${dur(F.timeOf(t, 1))}</small>${err && err !== 'Pas assez de bananes' ? `<small class="fm-err">${err}</small>` : ''}</div>
        <button class="btn btn-gold btn-sm" data-build="${t}" ${err ? 'disabled' : ''}>Construire</button></div>`;
    }).join('')}</div>`;
  }

  // Graines d'or : où on en est, combien on gagnerait en replantant
  function seedsHTML(fm) {
    const gain = F.seedGain(fm.life), next = F.lifeForSeeds(Math.max(F.REPLANT_MIN, gain + 1)), prev = gain >= F.REPLANT_MIN ? F.lifeForSeeds(gain) : 0;
    const pct = Math.max(0, Math.min(100, ((fm.life - prev) / Math.max(1, next - prev)) * 100));
    return `<div class="fm-seedbox"><h4>${SEED}Graines d'or</h4>
      <p>${fm.seeds ? `Tu as <b>${fm.seeds} graine${fm.seeds > 1 ? 's' : ''}</b> : <b>+${Math.round(F.SEED_BONUS * fm.seeds * 100)} %</b> de production, pour toujours.` : 'Replante ta ferme après 1 million de bananes récoltées pour gagner des graines d\'or : +5 % de production chacune, pour toujours.'}</p>
      <p class="muted">Récoltées depuis ${fm.rp ? 'la dernière replantation' : 'le début'} : <b>${fmt(Math.floor(fm.life))}</b>. ${gain >= F.REPLANT_MIN ? `Replanter maintenant : <b class="gold">+${gain}</b> graine${gain > 1 ? 's' : ''}.` : ''} Prochaine graine à ${fmt(next)}.</p>
      <div class="fm-bar"><i style="width:${pct}%"></i></div>
      ${gain >= F.REPLANT_MIN ? `<button class="btn btn-gold btn-sm" data-replant>${SEED}Replanter la ferme (+${gain})</button>` : ''}</div>`;
  }

  function overview() {
    const fm = f(), as = F.assignment(fm), now = Date.now();
    const q = [...fm.q].sort((a, b) => a.end - b.end);
    return `<h3>Ta ferme</h3>
      <p class="muted">Clique sur une case : un bâtiment pour l'améliorer, une case vide pour construire, une parcelle avec un cadenas pour l'acheter.</p>
      ${seedsHTML(fm)}
      <h4>Chantiers</h4>${q.length ? `<ul class="fm-q">${q.map((y) => `<li><span>${F.B[y.t].name} ${y.l === 1 ? '(nouveau)' : `niv. ${y.l}`}</span><b data-left="${y.end}">${dur(y.end - now)}</b></li>`).join('')}</ul>` : '<p class="muted">Aucun chantier en cours.</p>'}
      <h4>Bananeraies</h4><ul class="fm-q">${as.fields.sort((a, b) => b.w * b.per - a.w * a.per).map((x) => `<li><span>Niveau ${x.l} · ${x.w}/${x.cap} singes</span><b>${fmt(x.w * x.per)}/h</b></li>`).join('')}</ul>
      <ul class="fm-stats"><li><span>Bananes récoltées</span><b>${fmt(Math.floor(fm.tot))}</b></li><li><span>Bananes vendues</span><b>${fmt(fm.sold)}</b></li><li><span>${CUR} gagnés au marché</span><b>${fmt(fm.earned)}</b></li><li><span>Prix de vente</span><b>${F.sellRate(fm).toFixed(3).replace('.', ',')} ${CUR} / banane</b></li></ul>`;
  }

  /* ---------- actions ---------- */
  function act(fn, name, okMsg) {
    F.tick(f());
    const err = fn();
    if (err) { toast(err, 'error'); sfx.lose(); return; }
    save(wallet, name);
    sfx.coin();
    if (okMsg) toast(okMsg, 'win', 2500);
    refreshBoard(); side(); numbers();
  }
  async function buyLand() {
    const fm = f(), p = F.landPrice(fm);
    if (!F.buyable(fm, sel)) return;
    if (!wallet.debit('farm', p, { what: 'land' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    fm.own.push(sel);
    save(wallet, 'land');
    sfx.win(false); toast('Nouvelle parcelle !', 'win');
    refreshBoard(); side(); numbers();
  }
  async function buyBuilder() {
    const fm = f(), p = F.BUILDERS[fm.bu + 1];
    if (!p) return;
    const ok = await modal({ title: 'Engager un bâtisseur', html: `<p>Un bâtisseur de plus permet de mener <b>${fm.bu + 1} chantiers en même temps</b>.</p><p>Prix : ${money(p)}</p>`, buttons: [{ label: 'Annuler', value: false }, { label: 'Engager', value: true, primary: true }] });
    if (!ok || !alive) return;
    if (!wallet.debit('farm', p, { what: 'builder' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    fm.bu += 1;
    save(wallet, 'builder');
    sfx.win(true); toast('Nouveau bâtisseur engagé !', 'win');
    render();
  }
  function rush(i) {
    const fm = f(), q = fm.q.find((y) => y.i === i);
    if (!q) return;
    const p = F.rushCost(q.end - Date.now());
    if (!wallet.debit('farm', p, { what: 'rush' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    q.end = Date.now();
    // la minuterie globale termine le chantier dans la seconde (message + sauvegarde)
    setTimeout(() => { refreshBoard(); side(); }, 1100);
  }
  // Marché : vendre des bananes contre des Brundles, ou en acheter (1 Brundle = 1 banane, volontairement cher)
  async function sell(mode = 'sell') {
    const fm = f();
    F.tick(fm);
    const rate = F.sellRate(fm);
    const have = Math.floor(fm.b), room = F.buyRoom(fm), canBuy = Math.max(0, Math.min(room, Math.floor(wallet.balance / F.BUY_RATE)));
    let amount = 0;
    const body = (m) => mode === 'sell' ? `
      <p>Prix de vente : <b>${rate.toFixed(3).replace('.', ',')} ${CUR}</b> la banane${F.findType(fm, 'M') ? '' : ' (construis un marché pour vendre plus cher)'}.</p>
      ${have < 10 ? '<p class="muted">Il faut au moins 10 bananes pour vendre.</p>' : `<div class="fm-sell-pick">${[25, 50, 75, 100].map((p) => `<button type="button" class="btn btn-ghost btn-sm" data-p="${p}">${p} %</button>`).join('')}</div>
      <input type="range" id="fm-sell-r" min="10" max="${have}" value="${have}" step="1">
      <p class="fm-sell-sum"><span id="fm-sell-b"></span> → <b id="fm-sell-v"></b></p>`}
      <p class="muted fm-note">Garde des bananes si tu veux améliorer ta ferme : elles servent à tout construire.</p>` : `
      <p>Prix d'achat : <b>1 ${CUR}</b> la banane. C'est ${Math.round(F.BUY_RATE / rate)} fois plus cher que la vente : pratique pour débloquer une amélioration, mais la ferme se fait surtout à la sueur des singes !</p>
      ${canBuy < 1 ? `<p class="muted">${room < 1 ? 'Ton entrepôt est plein.' : `Pas assez de ${CUR}.`}</p>` : `<div class="fm-sell-pick">${[100, 1000, 10000].filter((n) => n < canBuy).map((n) => `<button type="button" class="btn btn-ghost btn-sm" data-n="${n}">${fmt(n)}</button>`).join('')}<button type="button" class="btn btn-ghost btn-sm" data-n="${canBuy}">Max (${fmt(canBuy)})</button></div>
      <input type="range" id="fm-sell-r" min="1" max="${canBuy}" value="${Math.min(canBuy, 100)}" step="1">
      <p class="fm-sell-sum"><b id="fm-sell-v"></b> → <span id="fm-sell-b"></span></p>`}
      <p class="muted fm-note">Place libre dans tes entrepôts : ${fmt(room)} bananes.</p>`;
    const res = await modal({ title: 'Marché aux bananes', cls: 'fm-market', html: `<div class="seg fm-mtabs"><button type="button" data-m="sell" class="${mode === 'sell' ? 'on' : ''}">Vendre</button><button type="button" data-m="buy" class="${mode === 'buy' ? 'on' : ''}">Acheter</button></div><div id="fm-mbody">${body()}</div>`,
      buttons: [{ label: 'Annuler', value: false }, { label: mode === 'sell' ? 'Vendre' : 'Acheter', value: mode, primary: true }],
      onOpen: (m) => {
        m.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { if (b.dataset.m !== mode) { m.querySelector('.modal-actions [data-i="0"]').click(); setTimeout(() => sell(b.dataset.m), 260); } }));
        const r = m.querySelector('#fm-sell-r');
        if (!r) return;
        const upd = () => {
          amount = +r.value;
          if (mode === 'sell') { m.querySelector('#fm-sell-b').innerHTML = ban(amount); m.querySelector('#fm-sell-v').innerHTML = money(Math.floor(amount * rate)); }
          else { m.querySelector('#fm-sell-b').innerHTML = ban(amount); m.querySelector('#fm-sell-v').innerHTML = money(amount * F.BUY_RATE); }
        };
        r.oninput = upd;
        m.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { r.value = Math.max(10, Math.floor((have * +b.dataset.p) / 100)); upd(); }));
        m.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { r.value = +b.dataset.n; upd(); }));
        upd();
      } });
    if (!alive || !res || amount < 1) return;
    F.tick(fm);
    if (res === 'sell') {
      amount = Math.min(amount, Math.floor(fm.b));
      const gain = Math.floor(amount * rate);
      if (amount < 1 || gain < 1) return;
      fm.b -= amount; fm.sold = (fm.sold || 0) + amount; fm.earned = (fm.earned || 0) + gain;
      wallet.credit('farm', gain, { bananas: amount });
      save(wallet, 'sell', { bananas: amount });
      sfx.win(gain >= 1000); coinRain(Math.min(40, 8 + Math.floor(gain / 200)));
      toast(`${fmt(amount)} bananes vendues : +${fmt(gain)} ${CUR}`, 'win');
    } else {
      amount = Math.min(amount, F.buyRoom(fm));
      if (amount < 1) { toast('Ton entrepôt est plein', 'error'); return; }
      if (!wallet.debit('farm', amount * F.BUY_RATE, { what: 'bananas' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
      F.buyBananas(fm, amount);
      save(wallet, 'buy', { bananas: amount });
      sfx.coin();
      toast(`${fmt(amount)} bananes achetées pour ${fmt(amount * F.BUY_RATE)} ${CUR}`, 'win');
    }
    numbers(); if (sel < 0) side();
  }

  // Replanter la ferme contre des graines d'or
  async function replant() {
    const fm = f();
    F.tick(fm);
    const err = F.canReplant(fm);
    if (err) { toast(err, 'error'); return; }
    const gain = F.seedGain(fm.life), after = (fm.seeds || 0) + gain;
    const ok = await modal({ title: 'Replanter la ferme ?', html: `
      <p>Tu gagnes <b class="gold">${gain} graine${gain > 1 ? 's' : ''} d'or</b> : ta production passera de <b>+${Math.round(F.SEED_BONUS * (fm.seeds || 0) * 100)} %</b> à <b>+${Math.round(F.SEED_BONUS * after * 100)} %</b>, pour toujours.</p>
      <ul class="muted"><li><b>Conservé</b> : tes ${fm.own.length} parcelles, tes ${fm.bu} bâtisseur${fm.bu > 1 ? 's' : ''}, tes graines d'or et tes statistiques.</li>
      <li><b>Remis à zéro</b> : tous les bâtiments, les singes, les bananes et les chantiers en cours.</li>
      <li>Tu repars avec une bananeraie, une cabane et un entrepôt de niveau <b>${F.restartLevel(after)}</b>, et un entrepôt rempli aux 4/5.</li></ul>
      <p class="muted fm-note">Plus tu récoltes avant de replanter, plus tu gagnes de graines : ${fmt(Math.round(F.lifeForSeeds(gain + 1) - fm.life))} bananes de plus pour une graine supplémentaire.</p>`,
      buttons: [{ label: 'Pas encore', value: false }, { label: `Replanter (+${gain})`, value: true, primary: true }] });
    if (!ok || !alive) return;
    if (F.replant(fm)) return;
    sel = -1;
    save(wallet, 'replant', { gain, seeds: fm.seeds });
    sfx.bonus(); coinRain(50);
    toast(`Ferme replantée : +${gain} graine${gain > 1 ? 's' : ''} d'or (production +${Math.round(F.SEED_BONUS * fm.seeds * 100)} %)`, 'win', 6000);
    render();
  }

  function help() {
    modal({ title: 'La ferme à bananes', cls: 'wide', html: `<ul class="muted fm-help">
      <li>Tes <b>singes ouvriers</b> récoltent des bananes dans les <b>bananeraies</b>, même quand tu n'es pas là.</li>
      <li>Chaque bananeraie a un nombre de <b>places</b>. Les singes logent dans les <b>cabanes</b> : embauche-en tant qu'il y a de la place et du travail.</li>
      <li>Les bananes s'entassent dans les <b>entrepôts</b>. Quand ils sont pleins, la récolte s'arrête : reviens régulièrement !</li>
      <li>Les <b>puits</b> irriguent les 8 cases autour (bonus aux bananeraies voisines), le <b>marché</b> fait monter le prix de vente.</li>
      <li>Les bananes servent à <b>tout construire et améliorer</b>, ou se <b>vendent</b> contre des ${CUR} au marché.</li>
      <li>Les chantiers prennent du temps (de quelques secondes à plusieurs heures). Engage des <b>bâtisseurs</b> pour en mener plusieurs à la fois, ou termine-les tout de suite en payant des ${CUR}.</li>
      <li>Les <b>parcelles</b> autour de ta ferme s'achètent en ${CUR}.</li>
      <li>Tu peux aussi <b>acheter des bananes</b> au marché, à 1 ${CUR} la banane (10 fois le prix de vente) : pratique pour débloquer une amélioration.</li>
      <li><b>Graines d'or</b> : après 1 million de bananes récoltées, tu peux <b>replanter</b> ta ferme. Bâtiments, singes et bananes repartent de zéro, mais tu gardes tes parcelles et tes bâtisseurs, et chaque graine donne <b>+5 % de production pour toujours</b>. Plus tu récoltes avant de replanter, plus tu gagnes de graines.</li>
      <li>Onglet <b>Les voisins</b> : visite les fermes des autres joueurs et compare vos productions.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  }

  /* ---------- voisins ---------- */
  async function neighbors() {
    const body = $('#fm-body', view);
    body.innerHTML = '<div class="panel"><p class="muted">Chargement des fermes…</p></div>';
    let players;
    try { players = await getPlayers(backend, wallet, false); } catch (e) { body.innerHTML = `<div class="panel"><p class="neg">Impossible de charger les fermes (${esc(e.message)}).</p></div>`; return; }
    if (!alive || tab !== 'nb') return;
    const now = Date.now();
    const rows = players.filter(hasFarm).map((p) => { const s = snapshot(p.farm, now); return { p, s, rate: F.productionPerHour(s) }; }).sort((a, b) => b.rate - a.rate);
    body.innerHTML = `<div class="panel"><h2><span class="h-ic">${BANANA}Les fermes de la jungle</span></h2>
      ${rows.length ? `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Fermier</th><th class="r">Production</th><th class="r">Parcelles</th><th class="r">Singes</th><th class="r">Graines d'or</th><th class="r">Bananes vendues</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.p.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.p.uid}">${avatarHTML(r.p, 'av-sm')}${esc(r.p.pseudo)}${r.p.uid === wallet.uid ? ' (toi)' : ''}</button></td>
        <td class="r"><b>${fmt(Math.round(r.rate))}</b> /h</td><td class="r">${r.s.own.length}</td><td class="r">${r.s.w}</td><td class="r">${r.s.seeds || 0}</td><td class="r">${fmt(r.s.sold || 0)}</td><td><button class="btn btn-ghost btn-sm" data-visit="${r.p.uid}">Visiter</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Personne n\'a encore de ferme.</p>'}
      <p class="muted fm-note">Les fermes des autres sont mises à jour à chacune de leurs sauvegardes (la production continue entre-temps).</p></div>`;
    $$('[data-visit]', body).forEach((b) => (b.onclick = () => { const r = rows.find((x) => x.p.uid === b.dataset.visit); if (r) visit(r.p); }));
  }
  render();
  const iv = setInterval(numbers, 1000);
  const onFarm = () => { if (tab === 'me') { refreshBoard(); side(); numbers(); } };
  window.addEventListener('chibouk:farm', onFarm);
  return () => { alive = false; clearInterval(iv); window.removeEventListener('chibouk:farm', onFarm); };
}

// Visite (lecture seule) de la ferme d'un joueur
export function visit(p) {
  const s = snapshot(p.farm), rate = F.productionPerHour(s);
  modal({ title: `La ferme de ${esc(p.pseudo)}`, cls: 'wide fm-visit', html: `
    <div class="fm-visit-kpis"><div><span>Production</span><b>${fmt(Math.round(rate))} /h</b></div><div><span>Parcelles</span><b>${s.own.length} / ${F.SIZE * F.SIZE}</b></div><div><span>Singes</span><b>${s.w}</b></div><div><span>Niveaux cumulés</span><b>${F.levels(s)}</b></div><div><span>Graines d'or</span><b>${s.seeds || 0}</b></div><div><span>Vendues</span><b>${fmt(s.sold || 0)}</b></div></div>
    ${boardHTML(s, { readOnly: true })}`, buttons: [{ label: 'Fermer', value: true, primary: true }] });
}
