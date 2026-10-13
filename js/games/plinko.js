// Plinkoko — 8/12/16 rangées, 3 niveaux de risque, plusieurs billes en même temps
import { TABLES, RISKS, ROWS, rtp, probability, dropPath } from './plinko-math.js';
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { h, $, $$, fmt, money, toast, modal, coinRain, betFieldHTML, bindBetField, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const W = 800, H = 720;
const fmtMult = (m) => (m >= 100 ? fmt(m) : String(m).replace('.', ','));

// Couleur d'une case selon son multiplicateur (vert = petit, rouge = énorme)
function binColor(m) {
  if (m >= 100) return ['#ff2d55', '#a3001f'];
  if (m >= 10) return ['#ff5a3d', '#b02a12'];
  if (m >= 3) return ['#ff9a3d', '#b55a0a'];
  if (m >= 1.5) return ['#ffc83d', '#a37500'];
  if (m >= 1) return ['#c9e05d', '#6b8a10'];
  return ['#5dd39e', '#1d7a4f'];
}

export function mount(view, { wallet }) {
  let alive = true;
  let rows = 16, risk = 'medium';
  try {
    const r = +localStorage.getItem('chibouk_plk_rows'); if (ROWS.includes(r)) rows = r;
    const k = localStorage.getItem('chibouk_plk_risk'); if (RISKS[k]) risk = k;
  } catch {}
  let balls = [];
  let pegFlash = new Map();
  let binPulse = [];
  let autoLeft = 0, autoTimer = null;
  let history = [];
  let raf;

  view.innerHTML = `
  <div class="plk-wrap">
    <div class="game-head"><h1>Plink<span>oko</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="plk-rules">${icon('scroll')}Règles</button></div></div>
    <div class="plk-layout">
      <aside class="side-panel">
        ${betFieldHTML('plk-bet')}
        <div class="seg-field"><label>Difficulté (risque)</label>
          <div class="seg" id="plk-risk">${Object.entries(RISKS).map(([k, n]) => `<button data-v="${k}">${n}</button>`).join('')}</div></div>
        <div class="seg-field"><label>Rangées</label>
          <div class="seg" id="plk-rows">${ROWS.map((r) => `<button data-v="${r}">${r}</button>`).join('')}</div></div>
        <button class="btn btn-gold btn-lg wide" id="plk-drop">Lâcher une noix</button>
        <div class="seg-field"><label>Lâcher en série</label>
          <div class="auto-row"><button class="btn btn-ghost btn-sm" data-auto="10">10</button><button class="btn btn-ghost btn-sm" data-auto="25">25</button><button class="btn btn-ghost btn-sm" data-auto="50">50</button><button class="btn btn-red btn-sm" id="plk-stop">Stop</button></div></div>
        <div class="plk-info"><span>Gain max</span><b id="plk-max"></b></div>
        <div class="plk-info"><span>RTP</span><b id="plk-rtp"></b></div>
        <div class="plk-hist" id="plk-hist"></div>
      </aside>
      <div class="plk-stage"><canvas width="${W}" height="${H}"></canvas></div>
    </div>
  </div>`;

  const canvas = $('canvas', view);
  const g = canvas.getContext('2d');
  const bet = bindBetField(view, 'plk-bet', 'chibouk_plk_bet', wallet, 10);

  /* ---------------- géométrie ---------------- */
  let geo;
  function layout() {
    const top = 60, bottom = H - 70;
    const gap = Math.min((W - 40) / (rows + 2), (bottom - top) / rows * 1.15);
    const rowGap = (bottom - top) / rows;
    const pegs = [];
    for (let r = 0; r < rows; r++) {
      const n = r + 3;
      for (let i = 0; i < n; i++) pegs.push({ r, x: W / 2 + (i - (n - 1) / 2) * gap, y: top + r * rowGap });
    }
    const binY = top + rows * rowGap - rowGap * 0.25;
    const bins = TABLES[rows][risk].map((m, k) => ({ m, x: W / 2 + (k - rows / 2) * gap, y: binY }));
    geo = { top, gap, rowGap, pegs, bins, pegR: Math.max(3, gap * 0.1), ballR: Math.max(6, gap * 0.22), binW: gap * 0.92, binH: Math.min(40, rowGap * 0.9) };
    binPulse = bins.map(() => 0);
  }

  function updateSide() {
    $$('#plk-risk button', view).forEach((b) => b.classList.toggle('on', b.dataset.v === risk));
    $$('#plk-rows button', view).forEach((b) => b.classList.toggle('on', +b.dataset.v === rows));
    const busy = balls.length > 0 || autoLeft > 0;
    $$('#plk-risk button, #plk-rows button', view).forEach((b) => (b.disabled = busy));
    $$('[data-auto]', view).forEach((b) => (b.disabled = autoLeft > 0));
    $('#plk-stop', view).style.display = autoLeft > 0 ? '' : 'none';
    const t = TABLES[rows][risk];
    $('#plk-max', view).textContent = '×' + fmtMult(Math.max(...t));
    $('#plk-rtp', view).textContent = (rtp(rows, risk) * 100).toFixed(1).replace('.', ',') + ' %';
  }
  function renderHist() {
    $('#plk-hist', view).innerHTML = history.slice(0, 12).map((m) => { const [c] = binColor(m); return `<span style="--c:${c}">×${fmtMult(m)}</span>`; }).join('');
  }

  $$('#plk-risk button', view).forEach((b) => (b.onclick = () => { if (balls.length) return; risk = b.dataset.v; try { localStorage.setItem('chibouk_plk_risk', risk); } catch {} layout(); updateSide(); sfx.click(); }));
  $$('#plk-rows button', view).forEach((b) => (b.onclick = () => { if (balls.length) return; rows = +b.dataset.v; try { localStorage.setItem('chibouk_plk_rows', rows); } catch {} layout(); updateSide(); sfx.click(); }));
  $('#plk-drop', view).onclick = () => drop();
  $$('[data-auto]', view).forEach((b) => (b.onclick = () => { autoLeft = +b.dataset.auto; updateSide(); autoStep(); }));
  $('#plk-stop', view).onclick = () => { autoLeft = 0; clearTimeout(autoTimer); updateSide(); };
  $('#plk-rules', view).onclick = showRules;
  const onKey = (e) => {
    if (e.code === 'Space' && !e.target.closest('input,textarea,button') && !document.querySelector('.modal-backdrop')) { e.preventDefault(); drop(); }
  };
  document.addEventListener('keydown', onKey);

  function autoStep() {
    if (!alive || autoLeft <= 0) return;
    if (!drop()) { autoLeft = 0; updateSide(); return; }
    autoLeft--;
    updateSide();
    if (autoLeft > 0) autoTimer = setTimeout(autoStep, 260);
  }

  /* ---------------- une bille ---------------- */
  function drop() {
    const amount = bet.value;
    if (!wallet.bet('plinko', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    const { path, bin } = dropPath(rows, () => randInt(2));
    const mult = TABLES[rows][risk][bin];
    const payout = Math.round(amount * mult);
    // Trajectoire : positions (en demi-écarts) à chaque rangée
    const pts = [{ x: W / 2 + (Math.random() - 0.5) * 6, y: geo.top - 45 }];
    let p = 0;
    for (let r = 0; r < rows; r++) {
      const peg = { x: W / 2 + p * geo.gap, y: geo.top + r * geo.rowGap };
      pts.push({ x: peg.x, y: peg.y - geo.ballR - geo.pegR, peg: r });
      p += path[r] ? 0.5 : -0.5;
    }
    pts.push({ x: geo.bins[bin].x, y: geo.bins[bin].y });
    balls.push({ pts, seg: 0, t: 0, bin, mult, payout, amount, rows, done: false, x: pts[0].x, y: pts[0].y });
    sfx.click();
    updateSide();
    return true;
  }

  function land(b) {
    b.done = true;
    if (b.payout > 0) wallet.win('plinko', b.payout, b.amount);
    wallet.round('plinko', b.payout > b.amount ? b.payout : 0);
    if (!alive) return;
    if (b.rows === rows) binPulse[b.bin] = 1;
    history.unshift(b.mult);
    renderHist();
    if (b.mult >= 10) { sfx.win(true); coinRain(Math.min(50, 10 + b.mult / 10)); toast(`×${fmtMult(b.mult)} ! +${fmt(b.payout)} ${CUR}`, 'win'); }
    else if (b.mult >= 1) sfx.coin(); else sfx.bounce(0.6);
  }

  /* ---------------- boucle ---------------- */
  let lastT = 0;
  function update(dt) {
    const segDur = 0.12; // secondes par rangée
    for (const b of balls) {
      b.t += dt / segDur;
      while (b.t >= 1 && b.seg < b.pts.length - 1) {
        b.t -= 1; b.seg++;
        const pt = b.pts[b.seg];
        if (pt.peg !== undefined) {
          const key = pt.peg + ':' + Math.round(pt.x);
          pegFlash.set(key, 1);
          if (Math.random() < 0.5) sfx.tick();
        }
      }
      if (b.seg >= b.pts.length - 1) { land(b); continue; }
      const a = b.pts[b.seg], c = b.pts[b.seg + 1];
      const t = Math.min(1, b.t);
      b.x = a.x + (c.x - a.x) * t;
      // petit rebond : la bille remonte puis retombe vers la cheville suivante
      b.y = a.y + (c.y - a.y) * t * t - Math.sin(Math.PI * t) * geo.rowGap * 0.28;
    }
    balls = balls.filter((b) => !b.done);
    for (const [k, v] of pegFlash) { const nv = v - dt * 4; if (nv <= 0) pegFlash.delete(k); else pegFlash.set(k, nv); }
    binPulse = binPulse.map((v) => Math.max(0, v - dt * 2.5));
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    // chevilles
    for (const p of geo.pegs) {
      const f = pegFlash.get(p.r + ':' + Math.round(p.x)) || 0;
      g.beginPath(); g.arc(p.x, p.y, geo.pegR + f * 3, 0, Math.PI * 2);
      g.fillStyle = f ? `rgba(255,220,100,${0.6 + f * 0.4})` : '#d7eadf';
      g.shadowColor = f ? '#ffd34d' : 'transparent'; g.shadowBlur = f ? 12 : 0;
      g.fill();
    }
    g.shadowBlur = 0;
    // cases
    const fs = Math.max(10, Math.min(18, geo.binW * 0.34));
    geo.bins.forEach((b, i) => {
      const pulse = binPulse[i];
      const [c1, c2] = binColor(b.m);
      const bw = geo.binW, bh = geo.binH;
      const y = b.y + pulse * 8;
      const grd = g.createLinearGradient(0, y, 0, y + bh);
      grd.addColorStop(0, c1); grd.addColorStop(1, c2);
      g.beginPath(); g.roundRect(b.x - bw / 2, y, bw, bh, 6); g.fillStyle = grd; g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(b.x - bw / 2 + 3, y + bh - 4, bw - 6, 3);
      g.fillStyle = '#1a0d00'; g.font = `800 ${fs}px Rubik, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText((b.m >= 100 ? fmt(b.m) : String(b.m).replace('.', ',')), b.x, y + bh / 2 + 1);
    });
    // billes (noix de coco dorées)
    for (const b of balls) {
      const r = geo.ballR;
      const grd = g.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, 1, b.x, b.y, r);
      grd.addColorStop(0, '#fff2a8'); grd.addColorStop(0.55, '#f5c542'); grd.addColorStop(1, '#a86f00');
      g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.fillStyle = grd; g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#6b4300'; g.stroke();
    }
  }

  function loop(t) {
    if (!alive) return;
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
    lastT = t;
    const had = balls.length;
    update(dt);
    if (had && !balls.length) updateSide();
    draw();
    raf = requestAnimationFrame(loop);
  }

  async function showRules() {
    const rowsHtml = ROWS.map((r) => `<tr><td>${r} rangées</td>${Object.keys(RISKS).map((k) => `<td class="r">×${fmtMult(Math.max(...TABLES[r][k]))}</td>`).join('')}</tr>`).join('');
    const t = TABLES[rows][risk];
    const probs = t.map((m, k) => `<span class="plk-prob" style="--c:${binColor(m)[0]}"><b>×${fmtMult(m)}</b><small>${(probability(rows, k) * 100).toFixed(k === 0 || k === rows ? 4 : 2).replace('.', ',')} %</small></span>`).join('');
    await modal({ title: 'Règles du Plinko', cls: 'wide', html: `
      <ul class="muted"><li>Choisis ta mise, la difficulté et le nombre de rangées, puis lâche une noix de coco.</li>
      <li>À chaque cheville, la noix part à gauche ou à droite (une chance sur deux). Elle finit le plus souvent au centre : les bords sont rares mais paient gros.</li>
      <li><b>Faible</b> : gains réguliers. <b>Moyen</b> : équilibré. <b>Élevé</b> : le centre paie ×0,2 mais les bords vont jusqu'à ×1000.</li>
      <li>RTP de 99 % pour toutes les combinaisons. Tu peux lâcher plusieurs noix en même temps (Espace).</li></ul>
      <h3>Gain maximum</h3><div class="tbl-scroll"><table class="tbl"><thead><tr><th></th>${Object.values(RISKS).map((n) => `<th class="r">${n}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      <h3>Probabilités actuelles (${rows} rangées, ${RISKS[risk]})</h3><div class="plk-probs">${probs}</div>`,
      buttons: [{ label: 'Compris', value: true, primary: true }] });
  }

  layout(); updateSide(); renderHist();
  raf = requestAnimationFrame(loop);

  return () => {
    alive = false;
    autoLeft = 0;
    clearTimeout(autoTimer);
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    // les billes encore en l'air sont payées immédiatement
    for (const b of balls) if (!b.done) land(b);
    balls = [];
  };
}
