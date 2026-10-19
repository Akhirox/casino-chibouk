// Jungle Connect — machine à sous 7×7 à clusters avec cascades (tumble), multiplicateurs et tours gratuits
// Tout le tour (cascades + tours gratuits éventuels) est tiré et payé d'un coup au clic, l'animation ne fait que le rejouer.
import * as J from './jungle-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR, isTurbo } from '../ui.js';
import { sfx } from '../sfx.js';

const N = J.N;
const mxFmt = (m) => '×' + String(m).replace('.', ',');
const TIERS = [[500, 'LÉGENDAIRE !', 'legend'], [100, 'GAIN ÉNORME !', 'huge'], [50, 'MÉGA GAIN !', 'mega'], [25, 'SUPER GAIN !', 'super'], [10, 'GROS GAIN !', 'big']];
const COLORS = { G: '#ffd23f', O: '#b28cff', T: '#ff8a3d', S: '#5fe08a', B: '#ffe45c', L: '#9ccc65', P: '#4caf50', X: '#ff5a36' };

// ---------- Symboles (SVG 64×64, dégradés partagés dans <defs> du plateau) ----------
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="jcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#c0800a"/></linearGradient>
  <linearGradient id="jcBeak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe14d"/><stop offset=".55" stop-color="#ff8a1a"/><stop offset="1" stop-color="#e2361b"/></linearGradient>
  <linearGradient id="jcSnake" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9f36a"/><stop offset="1" stop-color="#1f8a3a"/></linearGradient>
  <linearGradient id="jcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98c45"/><stop offset="1" stop-color="#6b3510"/></linearGradient>
  <linearGradient id="jcLeaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1f7a35"/><stop offset="1" stop-color="#8fe35b"/></linearGradient>
  <linearGradient id="jcBan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff59a"/><stop offset="1" stop-color="#f2b705"/></linearGradient>
  <linearGradient id="jcGor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#555b66"/><stop offset="1" stop-color="#1e2126"/></linearGradient>
</defs></svg>`;
const SVG = {
  G: `<circle cx="11" cy="33" r="7.5" fill="url(#jcGold)" stroke="#8a5a00" stroke-width="1.2"/><circle cx="53" cy="33" r="7.5" fill="url(#jcGold)" stroke="#8a5a00" stroke-width="1.2"/><circle cx="11" cy="33" r="3.6" fill="#ffe6a6"/><circle cx="53" cy="33" r="3.6" fill="#ffe6a6"/>
    <circle cx="32" cy="35" r="19" fill="url(#jcGold)" stroke="#8a5a00" stroke-width="1.5"/><path d="M19 37c0-7 6-11 13-11s13 4 13 11-6 13-13 13-13-6-13-13z" fill="#ffe9b0"/>
    <ellipse cx="26" cy="34" rx="3" ry="3.6" fill="#2a1600"/><ellipse cx="38" cy="34" rx="3" ry="3.6" fill="#2a1600"/><circle cx="27" cy="33" r="1.1" fill="#fff"/><circle cx="39" cy="33" r="1.1" fill="#fff"/>
    <path d="M26 43q6 5 12 0" stroke="#2a1600" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M20 9l5 7 7-9 7 9 5-7-2 11H22z" fill="#fff6b0" stroke="#a86f00" stroke-width="1.3" stroke-linejoin="round"/><circle cx="32" cy="13" r="1.8" fill="#ff4d5e"/>`,
  O: `<circle cx="11" cy="34" r="6" fill="#2e3138"/><circle cx="53" cy="34" r="6" fill="#2e3138"/>
    <path d="M12 31c0-13 9-21 20-21s20 8 20 21v6c0 11-9 17-20 17s-20-6-20-17z" fill="url(#jcGor)" stroke="#0f1013" stroke-width="1.5"/>
    <path d="M17 27q15-9 30 0l-1 5H18z" fill="#3c414a"/><path d="M19 39c0-6 6-8 13-8s13 2 13 8-5 12-13 12-13-5-13-12z" fill="#9095a0"/>
    <ellipse cx="25" cy="31.5" rx="2.6" ry="2.2" fill="#120a05"/><ellipse cx="39" cy="31.5" rx="2.6" ry="2.2" fill="#120a05"/><circle cx="25.8" cy="31" r=".9" fill="#ffb347"/><circle cx="39.8" cy="31" r=".9" fill="#ffb347"/>
    <ellipse cx="29" cy="39" rx="2.2" ry="1.5" fill="#2a2d33"/><ellipse cx="35" cy="39" rx="2.2" ry="1.5" fill="#2a2d33"/><path d="M25 46q7-3 14 0" stroke="#2a2d33" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  T: `<path d="M10 56c0-14 6-26 16-30 8-3 14 2 13 9-1 9-10 17-17 21z" fill="#16181d"/><path d="M22 58l3-8 4 7z" fill="#16181d"/>
    <circle cx="27" cy="24" r="11" fill="#16181d"/><path d="M20 26c1-5 6-8 11-6 3 5 0 11-6 12z" fill="#fff6dc"/><path d="M19 40c3 0 6-2 7-5" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M34 17c11-6 23-4 27 4-2 6-14 9-27 6z" fill="url(#jcBeak)" stroke="#9c2d00" stroke-width="1"/><path d="M34 22c9 0 18 0 26 0" stroke="#9c2d00" stroke-width="1" opacity=".6"/><path d="M57 18c2 1 3 2 4 3" stroke="#16181d" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="29" cy="20" r="3.6" fill="#4fd1ff"/><circle cx="29" cy="20" r="1.7" fill="#000"/><circle cx="29.7" cy="19.3" r=".6" fill="#fff"/>`,
  S: `<path d="M46 16c-11-6-28-2-28 8 0 11 28 6 28 17 0 10-16 14-30 9" stroke="url(#jcSnake)" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M46 16c-11-6-28-2-28 8 0 11 28 6 28 17 0 10-16 14-30 9" stroke="#e9ff9a" stroke-width="2.4" stroke-dasharray="2 7" fill="none" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="48" cy="15" rx="8.5" ry="6.5" fill="#3fae4e" stroke="#16571f" stroke-width="1.2"/><circle cx="49" cy="12.5" r="2.2" fill="#ffe14d"/><path d="M49 11v3" stroke="#000" stroke-width="1.2"/>
    <path d="M56 17l5 2m-5-2l4 4" stroke="#ff3b4e" stroke-width="1.6" stroke-linecap="round"/>`,
  B: `<path d="M18 12l5 6" stroke="#6b4a1e" stroke-width="5" stroke-linecap="round"/>
    <path d="M21 17c-2 17 8 31 30 33-14-6-22-17-24-33z" fill="url(#jcBan)" stroke="#a87b00" stroke-width="1.4"/>
    <path d="M21 17c-6 15-3 31 14 39-9-9-12-22-9-38z" fill="url(#jcBan)" stroke="#a87b00" stroke-width="1.4"/>
    <path d="M21 17c6 12 18 20 36 18-14-3-26-9-31-19z" fill="url(#jcBan)" stroke="#a87b00" stroke-width="1.4"/>
    <circle cx="51" cy="50" r="1.6" fill="#5a3b10"/><circle cx="35" cy="56" r="1.6" fill="#5a3b10"/><circle cx="57" cy="35" r="1.6" fill="#5a3b10"/>`,
  L: `<path d="M8 58C20 44 12 30 26 22s24 2 28-12" stroke="#7a5a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M26 22c-7-3-5-12 2-11 4 1 4 6 0 6" stroke="#7a5a2a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M17 41q-10-1-12-10 10 0 12 10z" fill="#7bd36b" stroke="#2d7a2a" stroke-width="1"/><path d="M20 33q3-9 12-9-2 8-12 9z" fill="#5fbf55" stroke="#2d7a2a" stroke-width="1"/>
    <path d="M44 16q-2-9 6-12 2 8-6 12z" fill="#7bd36b" stroke="#2d7a2a" stroke-width="1"/><path d="M40 22q8 3 14-2-7-5-14 2z" fill="#5fbf55" stroke="#2d7a2a" stroke-width="1"/>`,
  P: `<path d="M10 54Q18 20 54 10Q46 44 10 54z" fill="url(#jcLeaf)" stroke="#17532a" stroke-width="1.3"/>
    <path d="M10 54Q30 34 54 10" stroke="#e8ffd0" stroke-width="1.8" fill="none" opacity=".75"/>
    <path d="M18 44l-2-9M24 38l-2-11M30 32l-1-12M36 26l0-10M42 21l2-8M22 42l9 1M28 36l11 1M34 30l11 0M40 24l9-1" stroke="#17532a" stroke-width="1.2" opacity=".7"/>`,
  X: `<path d="M18 10l4 8M32 4v12M46 10l-4 8" stroke="#ff5a36" stroke-width="4" stroke-linecap="round"/><circle cx="18" cy="9" r="3" fill="#36c2ff"/><circle cx="32" cy="4" r="3" fill="#ffd23f"/><circle cx="46" cy="9" r="3" fill="#5fe08a"/>
    <path d="M32 14c12 0 19 7 19 19 0 15-8 27-19 27S13 48 13 33c0-12 7-19 19-19z" fill="url(#jcWood)" stroke="#3a1a05" stroke-width="1.6"/>
    <path d="M17 30l6-3 4 4-6 2zM47 30l-6-3-4 4 6 2z" fill="#fff"/><circle cx="23" cy="30.5" r="1.8" fill="#000"/><circle cx="41" cy="30.5" r="1.8" fill="#000"/>
    <path d="M18 24h28" stroke="#fff" stroke-width="2.4" stroke-dasharray="3 3"/><path d="M32 33v9" stroke="#3a1a05" stroke-width="2.4"/>
    <path d="M22 46h20v6H22z" fill="#2a0d02"/><path d="M24 46v3m4-3v3m4-3v3m4-3v3m4-3v3" stroke="#fff" stroke-width="1.8"/>
    <path d="M15 38l5 2M49 38l-5 2M16 43l5 1M48 43l-5 1" stroke="#e63946" stroke-width="2" stroke-linecap="round"/>`,
};
const symHTML = (s) => `<svg viewBox="0 0 64 64" class="jc-sym" aria-hidden="true">${SVG[s]}</svg>`;
export const jungleSymbolSVG = symHTML;

export function mount(view, { wallet }) {
  let alive = true, busy = false, autoLeft = 0, rush = false, pendingReveal = null;
  let cells = new Array(N * N).fill(null);
  let grid = J.spinJungle().final; // grille décorative de départ
  let history = [];

  view.innerHTML = `${DEFS}
  <div class="jc-wrap">
    <div class="game-head"><h1>Jungle <span>Connect</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="jc-rules">${icon('scroll')}Règles & gains</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('jc-bet')}
        <button class="btn btn-gold btn-lg wide" id="jc-spin">Tourner</button>
        ${autoHTML('jc-auto')}
        <div class="plk-info"><span>Gain max</span><b>×${fmt(J.MAX_WIN)}</b></div>
        <div class="plk-info"><span>Bonus</span><b>≈ 1 tour sur 127</b></div>
        <div class="plk-info"><span>RTP</span><b>98,5 %</b></div>
        <div class="dc-hist jc-hist" id="jc-hist"></div>
      </aside>
      <div class="jc-stage">
        <div class="jc-top">
          <div class="jc-title"><span>JUNGLE</span><b>CONNECT</b></div>
          <div class="jc-fs" id="jc-fs" hidden><span class="jc-fs-t">TOURS GRATUITS</span><b id="jc-fs-left">10</b><small>gain du bonus <b id="jc-fs-won">0</b></small></div>
        </div>
        <div class="jc-frame">
          <div class="jc-board" id="jc-board"></div>
          <div class="jc-fx" id="jc-fx"></div>
          <div class="jc-over" id="jc-over"></div>
        </div>
        <div class="jc-bar">
          <div class="jc-win"><span>GAIN</span><b id="jc-win">0</b><small id="jc-winx"></small></div>
          <div class="jc-casc" id="jc-casc"></div>
          <div class="jc-msg" id="jc-msg">5 symboles identiques reliés = gain · 3 masques = 10 tours gratuits</div>
        </div>
      </div>
    </div>
  </div>`;

  const board = $('#jc-board', view), fx = $('#jc-fx', view), over = $('#jc-over', view);
  const winEl = $('#jc-win', view), winX = $('#jc-winx', view), casc = $('#jc-casc', view), msg = $('#jc-msg', view);
  const bet = bindBetField(view, 'jc-bet', 'chibouk_jungle_bet', wallet, 20);
  const speed = () => (rush || isTurbo('jungle') ? 0.28 : autoLeft ? 0.75 : 1);
  const wait = (ms) => sleep(Math.max(0, ms * speed()));

  /* ---------- Plateau ---------- */
  function cellEl(s, r, c) {
    const el = document.createElement('div');
    el.className = `jc-cell s-${s}`;
    el.style.setProperty('--r', r); el.style.setProperty('--c', c);
    el.innerHTML = `<div class="jc-in">${symHTML(s)}</div>`;
    el.dataset.s = s;
    return el;
  }
  function renderStatic(g) {
    board.innerHTML = '';
    cells = g.map((s, k) => { const el = cellEl(s, (k / N) | 0, k % N); board.append(el); return el; });
  }
  // Les symboles en place tombent hors du plateau, puis la nouvelle grille arrive du haut, colonne par colonne
  async function dropIn(g) {
    const old = cells.filter(Boolean), sp = speed();
    old.forEach((el) => { const c = +el.style.getPropertyValue('--c'), r = +el.style.getPropertyValue('--r'); el.style.setProperty('--dl', `${(c * 28 + (N - r) * 10) * sp}ms`); el.style.setProperty('--dur', `${260 * sp}ms`); el.classList.add('out'); });
    await wait(150);
    cells = g.map((s, k) => {
      const r = (k / N) | 0, c = k % N, el = cellEl(s, r - N - 1, c);
      el.classList.add('falling');
      el.style.setProperty('--dl', `${(c * 45 + (N - 1 - r) * 22) * sp}ms`);
      el.style.setProperty('--dur', `${420 * sp}ms`);
      board.append(el);
      return el;
    });
    board.getBoundingClientRect(); // reflow pour lancer la transition
    cells.forEach((el, k) => el.style.setProperty('--r', (k / N) | 0));
    setTimeout(() => old.forEach((el) => el.remove()), 500 * sp);
    if (!isTurbo('jungle')) for (let c = 0; c < N; c++) setTimeout(() => alive && sfx.reelStop(c % 4), (c * 45 + 380) * sp);
    await wait(N * 45 + 520);
    cells.forEach((el) => el.classList.remove('falling'));
  }
  function particles(k, color, n = 7) {
    const r = (k / N) | 0, c = k % N;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 55;
      const p = document.createElement('i');
      p.className = 'jc-pt';
      p.style.cssText = `left:${((c + 0.5) / N) * 100}%;top:${((r + 0.5) / N) * 100}%;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${color};animation-duration:${(520 + Math.random() * 260) * speed()}ms`;
      fx.append(p);
      setTimeout(() => p.remove(), 900);
    }
  }
  function popAt(cellsIdx, html, cls = '') {
    const rs = cellsIdx.map((k) => (k / N) | 0), cs = cellsIdx.map((k) => k % N);
    const r = rs.reduce((a, b) => a + b, 0) / rs.length, c = cs.reduce((a, b) => a + b, 0) / cs.length;
    const el = document.createElement('div');
    el.className = 'jc-pop ' + cls;
    el.style.cssText = `left:${((c + 0.5) / N) * 100}%;top:${((r + 0.5) / N) * 100}%;animation-duration:${1500 * speed()}ms`;
    el.innerHTML = html;
    fx.append(el);
    setTimeout(() => el.remove(), 1600 * speed() + 50);
    return el;
  }

  /* ---------- Animation d'un tour ---------- */
  let shownWin = 0;
  function setWin(x, b) {
    shownWin = x;
    winEl.innerHTML = fmt(Math.floor(x * b));
    winX.textContent = x > 0 ? mxFmt(Math.round(x * 100) / 100) : '';
    winEl.parentElement.classList.remove('bump'); void winEl.offsetWidth; winEl.parentElement.classList.add('bump');
  }
  async function animSpin(res, b, { free = false, base = 0 } = {}) {
    casc.textContent = ''; casc.className = 'jc-casc';
    await dropIn(res.start);
    if (!alive) return;
    let acc = base, n = 0;
    for (const step of res.steps) {
      if (!alive) return;
      n++;
      if (n > 1) { casc.textContent = `Cascade ${n}`; casc.className = 'jc-casc on' + (n >= 4 ? ' hot' : ''); }
      // 1) les clusters gagnants s'illuminent
      for (const cl of step.clusters) for (const k of cl.cells) { const el = cells[k]; if (el) { el.classList.add('win'); el.style.setProperty('--glow', COLORS[cl.s]); } }
      board.classList.toggle('shake', n >= 3);
      sfx.coin();
      await wait(330);
      // 2) les multiplicateurs apparaissent un par un
      let pitch = 1;
      for (const cl of step.clusters) {
        for (const [k, v] of cl.mults) {
          const el = cells[k]; if (!el) continue;
          const b2 = document.createElement('span'); b2.className = `jc-mx x${v}`; b2.textContent = '×' + v; el.append(b2);
          sfx.bounce(pitch); pitch = Math.min(3, pitch * 1.12);
          await wait(cl.mults.length > 6 ? 70 : 140);
        }
      }
      // 3) gain de chaque cluster
      for (const cl of step.clusters) {
        const amt = Math.floor(cl.win * b);
        popAt(cl.cells, `${cl.mult > 1 ? `<i class="m${cl.mult >= 64 ? ' hot' : ''}">${mxFmt(cl.mult)}</i>` : ''}<b>+${fmt(amt)}</b><small>${cl.cells.length} ${J.SYM_NAME[cl.s]}</small>`, cl.mult >= 16 ? 'big' : '');
        if (cl.mult >= 16) { sfx.win(cl.mult >= 64); }
      }
      acc += step.win; setWin(acc, b);
      await wait(step.clusters.some((c) => c.mult > 1) ? 650 : 420);
      // 4) explosion
      let pc = 0;
      for (const cl of step.clusters) for (const k of cl.cells) { const el = cells[k]; if (!el) continue; el.classList.add('boom'); if (pc++ < 40 || Math.random() < 0.4) particles(k, COLORS[cl.s], speed() < 0.5 ? 3 : 6); }
      sfx.brick(1 + Math.min(1.5, n * 0.12));
      await wait(260);
      // 5) gravité + remplissage
      const gone = new Set(step.clusters.flatMap((c) => c.cells));
      const next = new Array(N * N).fill(null), sp = speed();
      gone.forEach((k) => { if (cells[k]) cells[k].remove(); });
      for (let k = 0; k < N * N; k++) if (!gone.has(k) && cells[k]) next[k] = cells[k];
      const moves = [];
      for (const [c, from, to] of step.drops) {
        if (from >= 0) { const el = cells[from * N + c]; next[from * N + c] = null; moves.push([el, to, c, from]); }
        else { const el = cellEl(step.grid[to * N + c], from, c); board.append(el); moves.push([el, to, c, from]); }
      }
      for (const [el, to, c] of moves) next[to * N + c] = el;
      board.getBoundingClientRect();
      for (const [el, to, c, from] of moves) {
        el.style.setProperty('--dur', `${(260 + (to - from) * 28) * sp}ms`);
        el.style.setProperty('--dl', `${c * 18 * sp}ms`);
        el.classList.add('falling');
        el.style.setProperty('--r', to);
      }
      cells = next;
      await wait(560);
      cells.forEach((el) => el && el.classList.remove('falling'));
      if (!isTurbo('jungle')) sfx.card();
    }
    board.classList.remove('shake');
    // masques : 3 ou plus = tours gratuits
    if (res.scatters >= 3) {
      cells.forEach((el) => el && el.dataset.s === J.SCATTER && el.classList.add('trig'));
      sfx.bonus();
      await wait(1100);
    } else if (res.scatters === 2 && !free) {
      cells.forEach((el) => el && el.dataset.s === J.SCATTER && el.classList.add('tease'));
    }
    return acc;
  }

  /* ---------- Écrans : bonus, gros gain ---------- */
  function overlay(html, cls, ms) {
    return new Promise((res) => {
      over.className = 'jc-over show ' + cls;
      over.innerHTML = html;
      let done = false;
      const end = () => { if (done) return; done = true; over.className = 'jc-over'; over.onclick = null; setTimeout(res, 200); };
      over.onclick = end;
      setTimeout(end, ms * (autoLeft || isTurbo('jungle') ? 0.55 : 1));
    });
  }
  async function bigWin(x, amount) {
    const t = TIERS.find(([m]) => x >= m); if (!t || !alive) return;
    coinRain(t[2] === 'legend' ? 90 : t[2] === 'huge' ? 70 : t[2] === 'mega' ? 50 : 30); sfx.win(true);
    const p = overlay(`<div class="jc-bw"><div class="jc-rays"></div><div class="jc-bw-t">${t[1]}</div><div class="jc-bw-a" id="jc-bwa">0</div><div class="jc-bw-x">${mxFmt(Math.round(x * 10) / 10)} la mise</div><small>Clique pour continuer</small></div>`, 'bw t-' + t[2], t[2] === 'big' ? 2200 : 3600);
    const a = $('#jc-bwa', over), t0 = performance.now(), dur = (t[2] === 'big' ? 1200 : 2400) * speed();
    while (alive && over.classList.contains('show')) { const k = Math.min(1, (performance.now() - t0) / dur); a.textContent = fmt(Math.floor(amount * (1 - Math.pow(1 - k, 3)))); if (k >= 1) break; await sleep(30); }
    if (a) a.textContent = fmt(amount);
    await p;
  }

  /* ---------- Une partie ---------- */
  function setDisabled(d) { bet.disabled = d; $('#jc-spin', view).disabled = d; }
  async function play() {
    if (busy) return false;
    const amount = bet.value;
    if (!wallet.bet('jungle', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    busy = true; rush = false; setDisabled(true);
    // tirage complet : tour payant + tours gratuits éventuels
    const base = J.spinJungle();
    let total = base.win, left = J.fsFor(base.scatters);
    const trig = left > 0, fsList = [];
    while (left > 0 && total < J.MAX_WIN) {
      left--;
      const r = J.spinJungle({ free: true, capLeft: J.MAX_WIN - total });
      fsList.push(r); total += r.win; left += J.fsFor(r.scatters, true);
    }
    total = Math.min(J.MAX_WIN, Math.round(total * 100) / 100);
    const payout = Math.floor(amount * total);
    const all = [base, ...fsList], steps = all.flatMap((r) => r.steps), clusters = steps.flatMap((s) => s.clusters);
    const info = {
      bet: amount, mult: total, bonus: trig, fs: fsList.length,
      cascades: Math.max(0, ...all.map((r) => r.steps.length)),
      clusterMult: Math.max(1, ...clusters.map((c) => c.mult)),
      cluster: Math.max(0, ...clusters.map((c) => c.cells.length)),
      golden: clusters.some((c) => c.s === 'G' && c.cells.length >= 15),
    };
    const reveal = wallet.deferEvents(() => {
      if (payout > 0) wallet.win('jungle', payout, amount);
      if (trig) wallet.track('jungle', 'bonuses');
      wallet.round('jungle', payout, info);
    }, trig ? 300000 : 30000);
    pendingReveal = reveal;

    setWin(0, amount); winEl.parentElement.classList.remove('bump');
    msg.textContent = 'Bonne chance…';
    if (!isTurbo('jungle')) sfx.spinStart();
    let acc = await animSpin(base, amount);
    if (alive && trig) {
      msg.innerHTML = `<b>${base.scatters} MASQUES TRIBAUX !</b>`;
      await overlay(`<div class="jc-fsi"><div class="jc-masks">${symHTML('X')}${symHTML('X')}${symHTML('X')}</div><h3>MASQUE TRIBAL</h3><p class="big">${J.FS_AWARD} TOURS GRATUITS</p><p>Multiplicateurs <b>×2</b> et <b>×4</b> plus fréquents</p><small>Clique pour commencer</small></div>`, 'fsi', 2600);
      view.querySelector('.jc-wrap').classList.add('free');
      const fsBox = $('#jc-fs', view); fsBox.hidden = false;
      let fsWon = 0, remain = J.FS_AWARD;
      for (const r of fsList) {
        if (!alive) break;
        remain--;
        $('#jc-fs-left', view).textContent = remain; $('#jc-fs-won', view).textContent = fmt(Math.floor(fsWon * amount));
        const before = acc;
        acc = await animSpin(r, amount, { free: true, base: acc });
        fsWon += acc - before;
        $('#jc-fs-won', view).textContent = fmt(Math.floor(fsWon * amount));
        if (r.scatters >= 3) { remain += J.FS_RETRIGGER; $('#jc-fs-left', view).textContent = remain; toast(`+${J.FS_RETRIGGER} tours gratuits !`, 'win'); }
        await wait(250);
      }
      if (alive) await overlay(`<div class="jc-fsi end"><h3>BONUS TERMINÉ</h3><p class="big">+${fmt(Math.floor(fsWon * amount))}</p><p>${fsList.length} tours gratuits</p></div>`, 'fsi', 2200);
      view.querySelector('.jc-wrap').classList.remove('free'); fsBox.hidden = true;
    }
    if (!alive) { reveal(); return true; }
    setWin(total, amount);
    if (total >= 10) await bigWin(total, payout);
    reveal(); pendingReveal = null;
    msg.innerHTML = payout > 0 ? `Gagné ! <b>+${money(payout)}</b>${info.cascades > 1 ? ` · ${info.cascades} cascades` : ''}` : 'Pas de cluster cette fois…';
    if (payout > 0) { if (total >= 2) sfx.win(total >= 10); if (total >= 5 && total < 10) coinRain(15); } else if (!isTurbo('jungle') && !autoLeft) sfx.lose();
    history.unshift({ x: total, b: trig }); history = history.slice(0, 14);
    $('#jc-hist', view).innerHTML = history.map((h) => `<span class="${h.x >= 1 ? 'good' : h.x > 0 ? '' : 'bad'}${h.b ? ' bon' : ''}">${h.x ? mxFmt(Math.round(h.x * 100) / 100) : '0'}</span>`).join('');
    busy = false;
    if (!autoLeft) setDisabled(false);
    return true;
  }

  const auto = bindAuto(view, 'jc-auto', { wallet, game: 'jungle', turbo: true, bet, delay: 250, play: () => play(), onState: (on) => { autoLeft = on ? 1 : 0; if (alive && !busy) setDisabled(on); } });
  $('#jc-spin', view).onclick = () => play();
  board.onclick = () => { if (busy) rush = true; };
  $('#jc-rules', view).onclick = () => modal({ title: 'Jungle Connect', cls: 'jc-rules-modal', html: rulesHTML(bet.value), buttons: [{ label: 'Compris', value: true, primary: true }] });
  const onKey = (e) => {
    if (e.target.closest('input,textarea,button,select') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (busy) rush = true; else if (!autoLeft) play(); }
  };
  document.addEventListener('keydown', onKey);
  renderStatic(grid);
  return () => { alive = false; autoLeft = 0; auto.stop(); if (pendingReveal) pendingReveal(); document.removeEventListener('keydown', onKey); };
}

function rulesHTML(b) {
  const rows = J.SYMS.map((s) => `<tr><td class="jc-rs">${symHTML(s)}<span>${J.SYM_NAME[s]}</span></td>${[5, 6, 8, 10, 12, 15].map((n) => `<td>${fmt(Math.floor(J.payOf(s, n) * b))}</td>`).join('')}</tr>`).join('');
  return `<ul class="muted">
    <li>Grille de <b>7×7</b>. Un gain = un <b>cluster</b> d'au moins <b>5 symboles identiques</b> reliés horizontalement ou verticalement (pas en diagonale).</li>
    <li><b>Cascade</b> : les symboles gagnants explosent, ceux du dessus tombent et de nouveaux arrivent par le haut. Ça continue tant qu'il y a des clusters, sans limite.</li>
    <li><b>Multiplicateurs</b> : chaque symbole d'un cluster gagnant peut révéler un <b>×2</b>. Ceux d'un même cluster se multiplient entre eux (trois ×2 = ×8), jusqu'à <b>×256</b> par cluster.</li>
    <li><b>Masque Tribal</b> : 3 masques ou plus sur la grille à la fin de la cascade = <b>10 tours gratuits</b> à la même mise (3 de plus pendant le bonus = +5 tours). Pendant les tours gratuits, les multiplicateurs apparaissent plus souvent (10 % au lieu de 6 %) et peuvent valoir ×4.</li>
    <li>Les nouveaux symboles qui tombent pendant les cascades sont un peu plus souvent des Singes Dorés et des Gorilles.</li>
    <li>Gain maximum : ×${fmt(J.MAX_WIN)} la mise par tour (bonus compris). RTP ≈ 98,5 % (simulé sur 28 millions de tours), bonus ≈ 1 tour sur 127.</li></ul>
    <p class="muted">Gains pour ta mise actuelle (${fmt(b)}), selon la taille du cluster, avant multiplicateurs :</p>
    <div class="jc-pt-wrap"><table class="jc-paytable"><thead><tr><th>Symbole</th><th>5</th><th>6</th><th>8</th><th>10</th><th>12</th><th>15+</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
