// Crashibouk — jeu "crash" : le multiplicateur grimpe, encaisse avant l'explosion
// Loi du point de crash : P(crash ≥ x) = 0,99 / x  → RTP de 99 % quelle que soit la stratégie
import { monkeySVG, icon } from '../art.js';
import { h, $, $$, fmt, money, toast, modal, coinRain, betFieldHTML, bindBetField, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const W = 900, H = 520, PAD_L = 56, PAD_B = 40, PAD_T = 24, PAD_R = 24;
const K = 0.1; // vitesse de croissance : m(t) = e^(K·t)  (×2 ≈ 7 s, ×10 ≈ 23 s)
const multAt = (t) => Math.exp(K * t);
const timeFor = (m) => Math.log(m) / K;
const fmtM = (m) => m.toFixed(2).replace('.', ',') + '×';

export function crashPoint() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const u = buf[0] / 4294967296;
  const x = Math.floor(99 / (1 - u)) / 100;
  return Math.min(1e6, Math.max(1, x));
}

export function mount(view, { wallet }) {
  let alive = true;
  let state = 'idle'; // idle | flying | crashed
  let round = null;   // { bet, crash, start, cashed, cashMult, payout, auto }
  let history = [];
  try { history = JSON.parse(localStorage.getItem('chibouk_crash_hist') || '[]'); } catch {}
  let autoOn = false, autoTarget = 2;
  try { autoOn = localStorage.getItem('chibouk_crash_auto_on') === '1'; const a = +localStorage.getItem('chibouk_crash_auto'); if (a >= 1.01) autoTarget = a; } catch {}
  let particles = [];
  let raf, lastT = 0, tickAcc = 0;

  view.innerHTML = `
  <div class="crash-wrap">
    <div class="game-head"><h1>Crash<span>ibouk</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="cr-rules">${icon('scroll')}Règles</button></div></div>
    <div class="crash-layout">
      <aside class="side-panel">
        ${betFieldHTML('cr-bet')}
        <div class="bet-field"><label for="cr-auto"><input type="checkbox" id="cr-auto-on"> Encaissement auto à</label>
          <div class="bet-field-row"><input id="cr-auto" class="bet-input" type="number" min="1.01" step="0.01" inputmode="decimal"><span class="suffix">×</span></div></div>
        <button class="btn btn-gold btn-lg wide cr-main" id="cr-main">Décoller</button>
        <div class="plk-info"><span>Gain potentiel</span><b id="cr-pot">—</b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
        <div class="cr-hist" id="cr-hist"></div>
      </aside>
      <div class="crash-stage">
        <canvas width="${W}" height="${H}"></canvas>
        <div class="cr-rocket"><div class="cr-rocket-inner">
          <svg viewBox="0 0 60 110" class="rocket-body" aria-hidden="true">
            <defs><linearGradient id="rkg" x1="0" x2="1"><stop offset="0" stop-color="#d9d9d9"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#bdbdbd"/></linearGradient></defs>
            <path class="flame" d="M18 86 Q30 118 42 86 Z" fill="#ffb02e"/><path class="flame f2" d="M23 86 Q30 106 37 86 Z" fill="#fff1a1"/>
            <path d="M10 70 L0 92 L16 84 Z M50 70 L60 92 L44 84 Z" fill="#ff4d5e" stroke="#8a1020" stroke-width="2"/>
            <path d="M30 2 C48 18 52 44 48 86 L12 86 C8 44 12 18 30 2 Z" fill="url(#rkg)" stroke="#8a5a00" stroke-width="2.5"/>
            <circle cx="30" cy="40" r="15" fill="#2a7de1" stroke="#c88a0a" stroke-width="3"/>
          </svg>
          <div class="rocket-pilot">${monkeySVG({})}</div>
        </div></div>
        <div class="cr-center"><div class="cr-mult">1,00×</div><div class="cr-sub" id="cr-sub">Prêt au décollage</div></div>
      </div>
    </div>
  </div>`;

  const canvas = $('canvas', view);
  const g = canvas.getContext('2d');
  const multEl = $('.cr-mult', view), subEl = $('#cr-sub', view);
  const rocket = $('.cr-rocket', view);
  const mainBtn = $('#cr-main', view);
  const bet = bindBetField(view, 'cr-bet', 'chibouk_crash_bet', wallet, 10);
  const autoInput = $('#cr-auto', view), autoChk = $('#cr-auto-on', view);
  autoInput.value = autoTarget.toFixed(2); autoChk.checked = autoOn;
  autoInput.onchange = () => { autoTarget = Math.max(1.01, Math.round((+autoInput.value || 2) * 100) / 100); autoInput.value = autoTarget.toFixed(2); try { localStorage.setItem('chibouk_crash_auto', autoTarget); } catch {} };
  autoChk.onchange = () => { autoOn = autoChk.checked; try { localStorage.setItem('chibouk_crash_auto_on', autoOn ? '1' : '0'); } catch {} };

  function renderHist() {
    $('#cr-hist', view).innerHTML = history.slice(0, 16).map((m) => `<span class="${m >= 10 ? 'gold' : m >= 2 ? 'good' : 'bad'}">${fmtM(m)}</span>`).join('');
  }

  function updateUI() {
    if (!alive) return;
    const flying = state === 'flying';
    bet.disabled = flying;
    autoInput.disabled = flying; autoChk.disabled = flying;
    mainBtn.classList.toggle('btn-gold', !flying || round.cashed);
    mainBtn.classList.toggle('btn-green', flying && !round.cashed);
    if (flying && !round.cashed) { mainBtn.disabled = false; }
    else if (flying && round.cashed) { mainBtn.disabled = true; mainBtn.textContent = `Encaissé : +${fmt(round.payout)}`; }
    else { mainBtn.disabled = false; mainBtn.textContent = 'Décoller'; }
  }

  mainBtn.onclick = () => { if (state === 'flying') cashOut(); else start(); };
  const onKey = (e) => {
    if (e.code === 'Space' && !e.target.closest('input,textarea,button') && !document.querySelector('.modal-backdrop')) {
      e.preventDefault(); if (state === 'flying') cashOut(); else start();
    }
  };
  document.addEventListener('keydown', onKey);
  $('#cr-rules', view).onclick = () => modal({ title: 'Règles du Crash', html: `
    <ul class="muted"><li>Mise, puis clique sur <b>Décoller</b> : le multiplicateur part de ×1,00 et grimpe de plus en plus vite.</li>
    <li>Clique sur <b>Encaisser</b> (ou Espace) quand tu veux : tu gagnes ta mise × le multiplicateur affiché.</li>
    <li>Si la fusée explose avant que tu encaisses, tu perds ta mise.</li>
    <li><b>Encaissement auto</b> : la fusée encaisse toute seule dès que le multiplicateur choisi est atteint.</li>
    <li>Le point d'explosion est tiré au hasard au décollage : environ 2 % d'explosion immédiate, une chance sur deux d'atteindre ×1,98, une sur dix d'atteindre ×9,9… RTP de 99 % quelle que soit ta stratégie.</li></ul>`,
    buttons: [{ label: 'Compris', value: true, primary: true }] });

  function start() {
    if (state === 'flying') return;
    const amount = bet.value;
    if (!wallet.bet('crash', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return; }
    round = { bet: amount, crash: crashPoint(), start: performance.now(), cashed: false, cashMult: 0, payout: 0, auto: autoOn ? autoTarget : 0, m: 1 };
    particles = [];
    state = 'flying';
    view.querySelector('.crash-stage').classList.remove('crashed', 'cashed');
    rocket.classList.remove('boom');
    subEl.textContent = round.auto ? `Encaissement auto à ${fmtM(round.auto)}` : 'Encaisse avant l\'explosion !';
    sfx.spinStart();
    updateUI();
  }

  function cashOut(at) {
    if (state !== 'flying' || round.cashed) return;
    const m = at || round.m;
    round.cashed = true;
    round.cashMult = m;
    round.payout = Math.floor(round.bet * m);
    wallet.win('crash', round.payout);
    wallet.round('crash', round.payout > round.bet ? round.payout : 0);
    if (!alive) return;
    view.querySelector('.crash-stage').classList.add('cashed');
    subEl.innerHTML = `Encaissé à <b>${fmtM(m)}</b> : +${money(round.payout)}`;
    sfx.coin(); if (m >= 5) { sfx.win(true); coinRain(Math.min(50, 10 + m * 2)); } else sfx.win();
    updateUI();
  }

  function explode() {
    state = 'crashed';
    round.m = round.crash;
    if (!round.cashed) wallet.round('crash', 0);
    history.unshift(round.crash); history = history.slice(0, 30);
    try { localStorage.setItem('chibouk_crash_hist', JSON.stringify(history)); } catch {}
    renderHist();
    const head = toScreen(timeFor(round.crash), round.crash);
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
      particles.push({ x: head.x, y: head.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: ['#ffb02e', '#ff4d5e', '#fff1a1', '#ffd34d'][i % 4] });
    }
    view.querySelector('.crash-stage').classList.add('crashed');
    rocket.classList.add('boom');
    if (!round.cashed) { subEl.innerHTML = `Explosion à <b>${fmtM(round.crash)}</b>, mise perdue`; sfx.lose(); }
    else subEl.innerHTML = `Encaissé à <b>${fmtM(round.cashMult)}</b> (+${money(round.payout)}), explosion à ${fmtM(round.crash)}`;
    sfx.bounce(0.4);
    updateUI();
  }

  /* -------------------- rendu du graphique -------------------- */
  let scale = { T: 8, M: 2 };
  function toScreen(t, m) {
    const x = PAD_L + (t / scale.T) * (W - PAD_L - PAD_R);
    const y = H - PAD_B - ((m - 1) / (scale.M - 1)) * (H - PAD_B - PAD_T);
    return { x, y };
  }

  function draw(now) {
    g.clearRect(0, 0, W, H);
    let t = 0, m = 1;
    if (round) {
      t = state === 'flying' ? (now - round.start) / 1000 : timeFor(round.m);
      m = state === 'flying' ? multAt(t) : round.m;
    }
    // échelle adaptative
    const targetT = Math.max(8, t * 1.15), targetM = Math.max(2, m * 1.25);
    scale.T += (targetT - scale.T) * 0.12; scale.M += (targetM - scale.M) * 0.12;
    if (state === 'idle') { scale.T = 8; scale.M = 2; }

    // grille
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.fillStyle = '#7f978a'; g.font = '600 13px Rubik, sans-serif';
    const mStep = niceStep(scale.M - 1);
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let v = 1; v <= scale.M + 1e-9; v += mStep) {
      const { y } = toScreen(0, v);
      g.beginPath(); g.moveTo(PAD_L, y); g.lineTo(W - PAD_R, y); g.stroke();
      g.fillText(fmtM(v), PAD_L - 8, y);
    }
    const tStep = niceStep(scale.T, 6);
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let v = 0; v <= scale.T + 1e-9; v += tStep) {
      const { x } = toScreen(v, 1);
      g.fillText(Math.round(v) + 's', x, H - PAD_B + 10);
    }

    // courbe
    if (round && t > 0) {
      const crashed = state === 'crashed';
      const color = crashed && !round.cashed ? '#ff4d5e' : '#3ddc84';
      g.beginPath();
      const steps = 80;
      let p0 = toScreen(0, 1);
      g.moveTo(p0.x, p0.y);
      for (let i = 1; i <= steps; i++) { const tt = (t * i) / steps; const p = toScreen(tt, multAt(tt)); g.lineTo(p.x, p.y); }
      const head = toScreen(t, m);
      const grd = g.createLinearGradient(0, H - PAD_B, 0, head.y);
      grd.addColorStop(0, color + '00'); grd.addColorStop(1, color + '55');
      g.save(); g.lineTo(head.x, H - PAD_B); g.lineTo(p0.x, H - PAD_B); g.closePath(); g.fillStyle = grd; g.fill(); g.restore();
      g.beginPath(); g.moveTo(p0.x, p0.y);
      for (let i = 1; i <= steps; i++) { const tt = (t * i) / steps; const p = toScreen(tt, multAt(tt)); g.lineTo(p.x, p.y); }
      g.strokeStyle = color; g.lineWidth = 5; g.lineCap = 'round'; g.shadowColor = color; g.shadowBlur = 14; g.stroke(); g.shadowBlur = 0;
      // marqueur d'encaissement
      if (round.cashed) {
        const c = toScreen(timeFor(round.cashMult), round.cashMult);
        g.beginPath(); g.arc(c.x, c.y, 7, 0, Math.PI * 2); g.fillStyle = '#ffd34d'; g.fill(); g.strokeStyle = '#6b4300'; g.lineWidth = 2; g.stroke();
      }
      // position et orientation de la fusée
      const back = toScreen(Math.max(0, t - 0.4), multAt(Math.max(0, t - 0.4)));
      const ang = Math.atan2(head.y - back.y, head.x - back.x) * 180 / Math.PI + 90;
      rocket.style.left = (head.x / W * 100) + '%';
      rocket.style.top = (head.y / H * 100) + '%';
      rocket.style.setProperty('--ang', ang + 'deg');
    } else {
      const p = toScreen(0, 1);
      rocket.style.left = (p.x / W * 100) + '%'; rocket.style.top = (p.y / H * 100) + '%';
      rocket.style.setProperty('--ang', '45deg');
    }
    // explosion
    for (const p of particles) {
      g.globalAlpha = Math.max(0, p.life);
      g.beginPath(); g.arc(p.x, p.y, 3 + p.life * 4, 0, Math.PI * 2); g.fillStyle = p.c; g.fill();
    }
    g.globalAlpha = 1;
    return { t, m };
  }

  function niceStep(range, target = 5) {
    const raw = range / target;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
  }

  function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016);
    lastT = now;
    if (state === 'flying') {
      const t = (now - round.start) / 1000;
      let m = multAt(t);
      if (round.auto && !round.cashed && round.auto <= round.crash && m >= round.auto) { round.m = round.auto; cashOut(round.auto); }
      if (m >= round.crash) { round.m = round.crash; explode(); }
      else {
        round.m = Math.floor(m * 100) / 100;
        multEl.textContent = fmtM(round.m);
        if (!round.cashed) $('#cr-pot', view).innerHTML = money(Math.floor(round.bet * round.m));
        if (!round.cashed) mainBtn.textContent = `Encaisser ${fmt(Math.floor(round.bet * round.m))}`;
        tickAcc += dt; if (tickAcc > Math.max(0.08, 0.4 / round.m)) { tickAcc = 0; sfx.tick(); }
      }
    }
    if (state === 'crashed') multEl.textContent = fmtM(round.crash);
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= dt * 1.2; }
    particles = particles.filter((p) => p.life > 0);
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  renderHist();
  updateUI();
  raf = requestAnimationFrame(loop);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    // si on quitte en plein vol sans avoir encaissé : on encaisse au multiplicateur actuel
    if (state === 'flying' && round && !round.cashed) {
      const m = Math.min(round.crash, Math.floor(multAt((performance.now() - round.start) / 1000) * 100) / 100);
      if (m < round.crash) cashOut(m); else wallet.round('crash', 0);
    }
  };
}
