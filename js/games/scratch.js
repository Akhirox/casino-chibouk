// Jeux à gratter — achète un ticket, gratte les cases (souris ou doigt), un clic dévoile une case,
// « Tout gratter » ou les paris automatiques font le reste. 3 montants identiques = gagné.
import { TICKETS, makeTicket, RTP } from './scratch-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const fmtM = (m) => '×' + String(m).replace('.', ',');

export function mount(view, { wallet }) {
  let alive = true, tk = TICKETS[0], cur = null, autoOn = false, cv = null, ctx = null, geo = null;
  try { const id = localStorage.getItem('chibouk_scratch_t'); const t = TICKETS.find((x) => x.id === id); if (t) tk = t; } catch {}

  view.innerHTML = `<div class="sc-wrap">
    <div class="game-head"><h1>Jeux à <span>gratter</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="sc-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        <div class="sc-pick" id="sc-pick"></div>
        <button class="btn btn-gold btn-lg wide" id="sc-buy"></button>
        <button class="btn btn-ghost wide" id="sc-all" disabled>Tout gratter</button>
        ${autoHTML('sc-auto', 'Tickets automatiques')}
        <div class="plk-info"><span>Gagnant</span><b>1 ticket sur ${(1 / tk.hit).toFixed(1).replace('.', ',')}</b></div>
        <div class="plk-info"><span>RTP</span><b>${Math.round(RTP * 100)} %</b></div>
      </aside>
      <div class="sc-stage" id="sc-stage"></div>
    </div></div>`;

  function renderPick() {
    $('#sc-pick', view).innerHTML = TICKETS.map((t) => `<button type="button" class="sc-opt sc-t-${t.theme} ${t.id === tk.id ? 'on' : ''}" data-t="${t.id}" ${cur && !cur.done ? 'disabled' : ''}>
      <b>${t.name}</b><span>${money(t.price)}</span><small>jusqu'à ${fmt(t.max * t.price)}</small></button>`).join('');
    $$('.sc-opt', view).forEach((b) => (b.onclick = () => { tk = TICKETS.find((x) => x.id === b.dataset.t); try { localStorage.setItem('chibouk_scratch_t', tk.id); } catch {} sfx.click(); renderPick(); if (!cur || cur.done) blank(); }));
    const buy = $('#sc-buy', view);
    buy.innerHTML = `Acheter ${money(tk.price)}`;
    buy.disabled = (cur && !cur.done) || autoOn;
    $('#sc-all', view).disabled = !cur || cur.done || autoOn;
    const hit = view.querySelector('.side-panel .plk-info b');
    if (hit) hit.textContent = `1 ticket sur ${(1 / tk.hit).toFixed(1).replace('.', ',')}`;
  }

  // ticket vierge (aperçu) avant achat
  function blank() {
    $('#sc-stage', view).innerHTML = ticketHTML(tk, null) + '<p class="sc-msg" id="sc-msg">Achète un ticket pour commencer à gratter.</p>';
  }
  // couleur par montant : rang du lot dans la table du ticket (0 = remboursé … 7 = gros lot)
  const tierOf = (t, m) => { const r = t.prizes.findIndex((p) => p.m === m), k = t.prizes.length - 1; return r <= 0 ? 0 : 1 + Math.round(((r - 1) * 6) / Math.max(1, k - 1)); };
  function ticketHTML(t, data) {
    return `<div class="sc-ticket sc-t-${t.theme}">
      <div class="sc-head"><b>${t.name}</b><span>3 montants identiques = gagné !</span><em>Jusqu'à ${fmt(t.max * t.price)} ${CUR}</em></div>
      <div class="sc-gridwrap"><div class="sc-grid" style="--cols:${t.cols}">${Array.from({ length: t.cells }, (_, i) => `<div class="sc-cell${data ? ' sc-m' + tierOf(t, data.cells[i]) : ''}" data-i="${i}">${data ? `<b>${fmt(data.cells[i] * t.price)}</b><small>${fmtM(data.cells[i])}</small>` : '<b>?</b>'}</div>`).join('')}</div>
      ${data ? '<canvas class="sc-cover" id="sc-cover"></canvas>' : '<div class="sc-cover-plain"></div>'}</div>
      <div class="sc-foot">Prix ${fmt(t.price)} ${CUR} · RTP ${Math.round(RTP * 100)} %</div></div>`;
  }

  function buy() {
    if (cur && !cur.done) return false;
    if (!wallet.bet('scratch', tk.price)) { toast(`Solde insuffisant pour un ticket à ${fmt(tk.price)} ${CUR}`, 'error'); return false; }
    const data = makeTicket(tk), t = tk;
    // gain enregistré tout de suite, annoncé (solde, succès, fil…) quand le ticket est entièrement gratté
    const reveal = wallet.deferEvents(() => {
      if (data.payout > 0) wallet.win('scratch', data.payout, t.price);
      wallet.round('scratch', data.payout > t.price ? data.payout : 0, { bet: t.price, mult: data.win, ticket: t.id });
    });
    cur = { t, data, open: new Set(), hits: new Array(t.cells).fill(0), reveal, done: false };
    $('#sc-stage', view).innerHTML = ticketHTML(t, data) + '<p class="sc-msg" id="sc-msg">Gratte les cases (ou clique dessus) !</p>';
    setupCanvas();
    sfx.card ? sfx.card() : sfx.click();
    renderPick();
    return true;
  }

  /* ---------- couche à gratter ---------- */
  function setupCanvas() {
    cv = $('#sc-cover', view);
    if (!cv) return;
    ctx = cv.getContext('2d');
    sizeCanvas();
    let down = false, moved = 0, start = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => { if (!cur || cur.done) return; e.preventDefault(); down = true; moved = 0; start = pos(e); cv.setPointerCapture(e.pointerId); scratch(...start); });
    cv.addEventListener('pointermove', (e) => { if (!down) return; const p = pos(e); moved += Math.hypot(p[0] - start[0], p[1] - start[1]); start = p; scratch(...p); });
    const up = (e) => { if (!down) return; down = false; if (moved < 6) { const i = cellAt(...pos(e)); if (i >= 0) openCell(i); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => (down = false));
  }
  function sizeCanvas() {
    if (!cv || !cur) return;
    const grid = cv.parentElement.querySelector('.sc-grid'), wr = cv.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(wr.width * dpr); cv.height = Math.round(wr.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = [...grid.children].map((c) => { const r = c.getBoundingClientRect(); return { x: r.left - wr.left, y: r.top - wr.top, w: r.width, h: r.height }; });
    drawCover();
  }
  const THEME = { banane: ['#ffe27a', '#e3a600'], singe: ['#d9c2ff', '#9b6bff'], tresor: ['#f5d77a', '#b88600'] };
  function drawCover() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cv.width, cv.height);
    const [a, b] = THEME[cur.t.theme];
    geo.forEach((g, i) => {
      if (cur.open.has(i)) return;
      const grd = ctx.createLinearGradient(g.x, g.y, g.x + g.w, g.y + g.h);
      grd.addColorStop(0, a); grd.addColorStop(0.5, '#fff6d0'); grd.addColorStop(1, b);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(g.x, g.y, g.w, g.h, 10) : ctx.rect(g.x, g.y, g.w, g.h); ctx.fill();
      ctx.fillStyle = 'rgba(80,50,0,.35)'; ctx.font = `800 ${Math.round(g.h * 0.28)}px Rubik, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', g.x + g.w / 2, g.y + g.h / 2);
    });
  }
  const cellAt = (x, y) => geo ? geo.findIndex((g) => x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) : -1;
  function scratch(x, y) {
    if (!cur || cur.done || !ctx) return;
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    const i = cellAt(x, y);
    if (i >= 0 && !cur.open.has(i)) { cur.hits[i]++; if (cur.hits[i] % 3 === 0) sfx.tick && sfx.tick(); if (cur.hits[i] >= 14) openCell(i); }
  }
  function openCell(i, quiet = false) {
    if (!cur || cur.done || cur.open.has(i)) return;
    cur.open.add(i);
    const g = geo && geo[i];
    if (g && ctx) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fillRect(g.x - 1, g.y - 1, g.w + 2, g.h + 2); }
    const el = view.querySelector(`.sc-cell[data-i="${i}"]`);
    if (el) el.classList.add('open');
    if (!quiet) sfx.click();
    if (cur.open.size === cur.t.cells) finish();
  }
  async function revealAll(fast = false) {
    if (!cur || cur.done) return;
    const c = cur;
    const order = [...Array(c.t.cells).keys()].filter((i) => !c.open.has(i));
    for (const i of order) {
      if (!alive || c.done || cur !== c) return;
      openCell(i, true);
      if (!document.hidden) await sleep(fast ? 25 : 90);
    }
  }

  function finish() {
    const c = cur;
    c.done = true;
    c.reveal();
    if (!alive) return;
    if (ctx && cv && cur === c) ctx.clearRect(0, 0, cv.width, cv.height);
    const { win, payout } = c.data, msg = $('#sc-msg', view);
    if (win) {
      $$('.sc-cell', view).forEach((el) => { if (c.data.cells[+el.dataset.i] === win) el.classList.add('win'); });
      msg.innerHTML = win === 1 ? `Ticket remboursé : +${money(payout)}` : `Gagné ! ${fmtM(win)} : <b>+${money(payout)}</b>`;
      msg.className = 'sc-msg win';
      if (win >= 10) { sfx.win(true); coinRain(Math.min(60, 15 + win / 5)); } else sfx.coin();
    } else { msg.textContent = 'Perdu… pas de trio cette fois.'; msg.className = 'sc-msg lose'; sfx.lose(); }
    renderPick();
  }

  $('#sc-buy', view).onclick = () => buy();
  $('#sc-all', view).onclick = () => revealAll();
  $('#sc-rules', view).onclick = () => modal({ title: 'Jeux à gratter', cls: 'wide', html: `
    <ul class="muted"><li>Choisis un ticket, achète-le, puis gratte les cases avec la souris ou le doigt. Un clic sur une case la dévoile d'un coup, « Tout gratter » dévoile tout.</li>
    <li>Si <b>3 montants identiques</b> apparaissent, tu gagnes ce montant. Un seul gain possible par ticket.</li>
    <li>Le gain est enregistré dès l'achat : si tu quittes la page avant d'avoir tout gratté, tu ne perds rien.</li></ul>
    <div class="tbl-scroll"><table class="tbl"><thead><tr><th>Ticket</th><th class="r">Prix</th><th class="r">Gagnant</th><th class="r">Gain max</th><th class="r">RTP</th></tr></thead><tbody>
    ${TICKETS.map((t) => `<tr><td>${t.name}</td><td class="r">${fmt(t.price)}</td><td class="r">1 sur ${(1 / t.hit).toFixed(1).replace('.', ',')}</td><td class="r">${fmt(t.max * t.price)}</td><td class="r">${Math.round(RTP * 100)} %</td></tr>`).join('')}</tbody></table></div>
    <h3>${tk.name} : chances de gain</h3><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Lot</th><th class="r">Gain</th><th class="r">Chance</th></tr></thead><tbody>
    ${tk.prizes.map((p) => `<tr><td>${fmtM(p.m)}</td><td class="r">${fmt(p.m * tk.price)}</td><td class="r">1 sur ${fmt(Math.round(1 / p.p))}</td></tr>`).join('')}</tbody></table></div>`,
    buttons: [{ label: 'Compris', value: true, primary: true }] });

  const auto = bindAuto(view, 'sc-auto', { wallet, game: 'scratch', delay: 500,
    play: async () => { if (cur && !cur.done) await revealAll(true); if (!buy()) return false; await sleep(document.hidden ? 0 : 150); await revealAll(true); return true; },
    onState: (on) => { autoOn = on; if (alive) renderPick(); } });

  const onResize = () => { if (cur && !cur.done) sizeCanvas(); };
  const onVis = () => { if (document.hidden && cur && !cur.done && autoOn) revealAll(true); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  renderPick(); blank();
  return () => {
    alive = false; auto.stop();
    window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
    if (cur && !cur.done) { cur.done = true; cur.reveal(); } // gain déjà enregistré : on l'affiche
  };
}
