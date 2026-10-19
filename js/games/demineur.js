// Démineur — jeu gratuit avec compte à rebours, 3 niveaux (grille de plus en plus grande).
// Clic : découvrir (sur un chiffre entouré du bon nombre de drapeaux : découvre les voisines).
// Clic droit ou appui long : drapeau. Le premier clic ne tombe jamais sur une mine.
import { $, $$, fmt, modal, coinRain, CUR } from '../ui.js';
import { bombTileSVG, monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { createGuard, judge, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';
import { makeTimer, modesHTML, bindModes, savedLevel, saveLevel, endCardHTML, fmtTime, fmtTimeLong } from './free-common.js';

export const MS_LEVELS = [
  { name: 'Facile', rows: 9, cols: 9, mines: 10, limit: 180, reward: 40 },
  { name: 'Moyen', rows: 16, cols: 16, mines: 40, limit: 480, reward: 120 },
  { name: 'Difficile', rows: 16, cols: 30, mines: 99, limit: 900, reward: 300 },
];
MS_LEVELS.forEach((l) => (l.desc = `${l.rows} × ${l.cols}, ${l.mines} mines, ${Math.round(l.limit / 60)} min`));
const FLAG = '<svg viewBox="0 0 24 24" class="ms-flag" aria-hidden="true"><path d="M6 21V3.5" stroke="#eaf2ec" stroke-width="2" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="#ff4d5e"/></svg>';

export function mount(view, { wallet }) {
  let guard = null;
  let alive = true, lv = savedLevel('chibouk_ms_lv', 0), R = 0, C = 0, M = 0, mine = null, open = null, flag = null, adj = null;
  let state = 'intro', started = false, flagMode = false, timer = null, boom = -1;
  view.innerHTML = `<div class="fg-wrap ms-wrap">
    <div class="game-head"><h1>Démi<span>neur</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${MS_LEVELS[0].reward} à +${MS_LEVELS[2].reward * 2} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  const bestTxt = (i) => { const b = wallet.stats['demineurBest' + i]; return b ? ` · record ${fmtTimeLong(b)}` : ''; };

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Déminer avant la fin du chrono</h2>
      <p>Découvre toutes les cases sans mine avant la fin du temps. Plus tu finis vite, plus le gain grimpe : <b>jusqu'à ×2</b> si tu finis tout de suite.</p>
      ${modesHTML(MS_LEVELS, lv, (l, i) => `+${l.reward} à +${l.reward * 2} ${CUR}${bestTxt(i)}`, 'demineur')}
      ${lockBannerHTML(wallet, 'demineur')}
      <button class="btn btn-gold btn-lg" id="fg-start" ${lockedUntil(wallet, 'demineur') ? 'disabled' : ''}>Nouvelle partie</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_ms_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    if (lockedUntil(wallet, 'demineur')) { intro(); return; }
    const L = MS_LEVELS[lv];
    R = L.rows; C = L.cols; M = L.mines;
    // sur un écran étroit, la grande grille passe en vertical
    if (C > R && view.clientWidth < 720) [R, C] = [C, R];
    mine = new Uint8Array(R * C); open = new Uint8Array(R * C); flag = new Uint8Array(R * C); adj = new Uint8Array(R * C);
    state = 'play'; started = false; boom = -1;
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="fg-time">${fmtTime(L.limit)}</span><span class="fg-info" id="fg-info"></span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm ms-fbtn" id="ms-flagmode">${FLAG}<span>Drapeau : non</span></button><button class="btn btn-ghost btn-sm" id="fg-rules">Règles</button></span></div>
      <div class="ms-scroll"><div class="ms-board" id="ms-board" style="--cols:${C}">${[...Array(R * C).keys()].map((i) => `<div class="ms-cell" data-i="${i}"></div>`).join('')}</div></div>`;
    sizeBoard();
    timer && timer.destroy();
    timer = makeTimer($('#fg-time', stage), { limit: L.limit, onEnd: () => lose(true) });
    guard && guard.destroy(); guard = createGuard(stage);
    $('#ms-flagmode', stage).onclick = () => { flagMode = !flagMode; $('#ms-flagmode span', stage).textContent = `Drapeau : ${flagMode ? 'oui' : 'non'}`; $('#ms-flagmode', stage).classList.toggle('on', flagMode); };
    $('#fg-rules', stage).onclick = () => modal({ title: 'Règles du démineur', html: `<ul class="muted">
      <li>Chaque chiffre indique combien de <b>mines</b> touchent la case (les 8 cases autour).</li>
      <li><b>Clic</b> : découvrir une case. <b>Clic droit</b> (ou <b>appui long</b> sur téléphone, ou le bouton Drapeau) : poser un drapeau.</li>
      <li>Clic sur un chiffre déjà entouré du bon nombre de drapeaux : découvre toutes ses voisines d'un coup.</li>
      <li>Le premier clic ne tombe jamais sur une mine. Le chrono démarre à ce moment-là.</li>
      <li>Gagné quand toutes les cases sans mine sont découvertes avant la fin du temps. Gain = base × (1 + temps restant ÷ temps total).</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
    bindBoard();
    render();
  }

  function sizeBoard() {
    const board = $('#ms-board', stage);
    if (!board) return;
    const w = Math.max(240, stage.clientWidth - 8);
    const cs = Math.max(lv === 2 ? 22 : 24, Math.min(38, Math.floor(w / C)));
    board.style.setProperty('--cs', cs + 'px');
  }

  const nb = (i) => { const r = Math.floor(i / C), c = i % C, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < R && cc < C) out.push(rr * C + cc); }
    return out; };

  function placeMines(safe) {
    const forbid = new Set([safe, ...nb(safe)]);
    const pool = [...Array(R * C).keys()].filter((i) => !forbid.has(i));
    for (let k = 0; k < M; k++) { const j = k + Math.floor(Math.random() * (pool.length - k)); [pool[k], pool[j]] = [pool[j], pool[k]]; mine[pool[k]] = 1; }
    for (let i = 0; i < R * C; i++) adj[i] = nb(i).reduce((a, j) => a + mine[j], 0);
  }

  function reveal(i) {
    if (open[i] || flag[i]) return;
    if (mine[i]) { boom = i; lose(false); return; }
    const stack = [i];
    while (stack.length) {
      const x = stack.pop();
      if (open[x] || flag[x]) continue;
      open[x] = 1;
      if (!adj[x]) for (const y of nb(x)) if (!open[y] && !mine[y]) stack.push(y);
    }
  }

  function act(i, wantFlag) {
    if (state !== 'play') return;
    if (wantFlag) { if (!open[i]) { flag[i] = flag[i] ? 0 : 1; sfx.click(); render(); } return; }
    if (!started) { placeMines(i); started = true; timer.start(); }
    if (open[i]) {
      // clic sur un chiffre : découvre les voisines si le nombre de drapeaux correspond
      const ns = nb(i);
      if (adj[i] && ns.filter((j) => flag[j]).length === adj[i]) ns.forEach((j) => state === 'play' && reveal(j));
    } else reveal(i);
    if (state !== 'play') return;
    sfx.tick && sfx.tick();
    render();
    if (open.reduce((a, b) => a + b, 0) === R * C - M) win();
  }

  function bindBoard() {
    const board = $('#ms-board', stage);
    let pressT = null, longDone = false, downAt = null;
    board.addEventListener('contextmenu', (e) => { e.preventDefault(); const el = e.target.closest('.ms-cell'); if (el && e.pointerType !== 'touch') act(+el.dataset.i, true); });
    board.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.ms-cell');
      if (!el || e.button === 2) return;
      longDone = false; downAt = [e.clientX, e.clientY];
      clearTimeout(pressT);
      if (e.pointerType === 'touch') pressT = setTimeout(() => { longDone = true; act(+el.dataset.i, true); try { navigator.vibrate && navigator.vibrate(30); } catch {} }, 380);
    });
    board.addEventListener('pointermove', (e) => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) clearTimeout(pressT); });
    board.addEventListener('pointerup', (e) => {
      clearTimeout(pressT);
      const el = e.target.closest('.ms-cell');
      if (!el || e.button === 2 || longDone || !downAt) { downAt = null; return; }
      downAt = null;
      act(+el.dataset.i, flagMode);
    });
  }

  function render() {
    if (!alive || !mine) return;
    const flags = flag.reduce((a, b) => a + b, 0);
    $('#fg-info', stage).textContent = `${Math.max(0, M - flags)} mines restantes`;
    const done = state !== 'play';
    $$('.ms-cell', stage).forEach((el) => {
      const i = +el.dataset.i;
      let cls = 'ms-cell', html = '';
      if (open[i]) { cls += ' open'; if (adj[i]) { cls += ' n' + adj[i]; html = adj[i]; } }
      else if (done && mine[i]) { cls += ' open mine' + (i === boom ? ' boom' : ''); html = flag[i] && state === 'won' ? FLAG : bombTileSVG(); }
      else if (flag[i]) { cls += ' flag' + (done && !mine[i] ? ' wrong' : ''); html = FLAG; }
      if (el.className !== cls) el.className = cls;
      if (el.innerHTML !== String(html)) el.innerHTML = html;
    });
  }

  function lose(timeout) {
    if (state !== 'play') return;
    state = 'lost';
    timer.stop();
    wallet.freeReward('demineur', 0, { Lost: 1 });
    render();
    sfx.lose();
    $('#ms-board', stage).classList.add('lost');
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: false, title: timeout ? 'Temps écoulé !' : 'BOUM !', amount: 0,
        text: timeout ? 'Le chrono a eu raison de toi.' : 'Tu as marché sur une mine. Retente ta chance !',
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 900);
  }

  function win() {
    state = 'won';
    timer.stop();
    for (let i = 0; i < R * C; i++) if (mine[i]) flag[i] = 1;
    const L = MS_LEVELS[lv], sec = Math.round(timer.elapsed), left = Math.max(0, L.limit - sec);
    const bonus = Math.round(L.reward * (left / L.limit)), amount = L.reward + bonus;
    // contrôle fair-play avant toute récompense
    let v = judge(guard, {}); guard = null;
    if (v.flag !== 'ok') {
      let pn = null;
      if (v.flag === 'cheat') { pn = punish(wallet, 'demineur', lv, v, amount); sfx.lose(); } else tooFast(wallet, 'demineur', lv, v);
      stage.insertAdjacentHTML('beforeend', refusedHTML(v, pn));
      $('[data-again]', stage).onclick = v.flag === 'cheat' ? intro : start;
      return;
    }
    const s = wallet.stats, key = 'demineurBest' + lv, record = !s[key] || sec < s[key];
    if (record) s[key] = sec;
    wallet.freeReward('demineur', amount, { Won: 1, ['Won' + lv]: 1 }, { ...(lv >= 1 && record ? { feed: { txt: `a battu son record en grille ${['facile', 'moyenne', 'difficile'][lv]} au`, tail: `: ${fmtTimeLong(sec)}` } } : {}), log: { lv, sec: v.sec, actions: v.actions, fastShare: v.fastShare } });
    render();
    $('#ms-board', stage).classList.add('solved');
    sfx.win(true); coinRain(lv === 2 ? 50 : 25);
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: true, title: 'Terrain déminé !', amount,
        text: `${L.name} en <b>${fmtTimeLong(sec)}</b> (bonus de temps +${fmt(bonus)}).${record ? ' Nouveau record !' : ` Record : ${fmtTimeLong(s[key])}.`}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 700);
  }

  const onResize = () => sizeBoard();
  window.addEventListener('resize', onResize);
  const onKey = (e) => { if (state !== 'play' && state !== 'intro' && e.key === 'Enter' && !e.target.closest('button,input') && !document.querySelector('.modal-backdrop')) start(); };
  document.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; timer && timer.destroy(); guard && guard.destroy(); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); };
}
