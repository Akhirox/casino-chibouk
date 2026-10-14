// Queens (Reines) — jeu gratuit de logique : une reine par ligne, par colonne et par zone de couleur,
// et deux reines ne se touchent jamais, même en diagonale. Clic : croix → reine → vide (glisser pour poser des croix).
import { generateQueens } from './queens-gen.js';
import { $, $$, money, fmt, toast, modal, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { makeTimer, modesHTML, bindModes, savedLevel, saveLevel, endCardHTML, speedBonus, fmtTimeLong } from './free-common.js';

export const QUEENS_LEVELS = [
  { n: 7, name: '7 × 7', desc: 'Pour s\'échauffer', reward: 60, par: 120 },
  { n: 8, name: '8 × 8', desc: 'Le format classique', reward: 90, par: 180 },
  { n: 9, name: '9 × 9', desc: 'Pour les têtes couronnées', reward: 130, par: 240 },
];
const COLORS = ['#f2a65a', '#8ecae6', '#e9d36c', '#c7a0d9', '#9ed67a', '#f28b82', '#7fd1b9', '#d4b896', '#a3b4ff'];
const crownSVG = '<svg viewBox="0 0 24 24" class="qn-crown" aria-hidden="true"><path d="M3 18.5h18l-1.6-10-4.6 4.2L12 5.5l-2.8 7.2-4.6-4.2z" fill="currentColor"/><rect x="3" y="19.5" width="18" height="2" rx="1" fill="currentColor"/></svg>';

const RULES = `<ul class="muted">
  <li>Place <b>exactement une reine</b> par ligne, par colonne et par zone de couleur.</li>
  <li>Deux reines ne peuvent <b>jamais se toucher</b>, même en diagonale.</li>
  <li>Un clic pose une <b>croix</b> (case où il ne peut pas y avoir de reine), un 2ᵉ clic pose une <b>reine</b>, un 3ᵉ vide la case. Tu peux glisser pour poser plusieurs croix d'un coup.</li>
  <li>Chaque grille n'a qu'une seule solution, et se résout par la logique.</li></ul>`;

export function mount(view, { wallet }) {
  let alive = true, lv = savedLevel('chibouk_queens_lv', 1), puzzle = null, cells = [], state = 'intro', history = [];
  view.innerHTML = `<div class="fg-wrap qn-wrap">
    <div class="game-head"><h1>Que<span>ens</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${QUEENS_LEVELS[0].reward} à +${QUEENS_LEVELS[2].reward} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  let timer = null;

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Une reine par ligne, colonne et couleur</h2>
      <p>Et jamais deux reines côte à côte, même en diagonale. Gain selon la taille, <b>+50 %</b> si tu bats le temps de référence.</p>
      ${modesHTML(QUEENS_LEVELS, lv, (l, i) => `+${l.reward} ${CUR} · bonus sous ${Math.round(l.par / 60)} min${bestTxt(i)}`)}
      <button class="btn btn-gold btn-lg" id="fg-start">Nouvelle grille</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_queens_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }
  const bestTxt = (i) => { const b = wallet.stats['queensBest' + QUEENS_LEVELS[i].n]; return b ? ` · record ${fmtTimeLong(b)}` : ''; };

  function start() {
    const L = QUEENS_LEVELS[lv];
    puzzle = generateQueens(L.n);
    if (!puzzle) { toast('Génération impossible, réessaie', 'error'); return; }
    cells = Array.from({ length: L.n }, () => new Array(L.n).fill(0)); // 0 vide, 1 croix, 2 reine
    history = [];
    state = 'play';
    const n = L.n, R = puzzle.regions;
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="fg-time">0:00</span><span class="fg-info" id="fg-info">0 / ${n} reines</span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="fg-undo">Annuler</button><button class="btn btn-ghost btn-sm" id="fg-clear">Tout effacer</button><button class="btn btn-ghost btn-sm" id="fg-rules">Règles</button></span></div>
      <div class="qn-board" id="qn-board" style="--n:${n}">${R.map((row, r) => row.map((g, c) => {
        const b = [r === 0 || R[r - 1][c] !== g ? 't' : '', c === n - 1 || R[r][c + 1] !== g ? 'r' : '', r === n - 1 || R[r + 1][c] !== g ? 'b' : '', c === 0 || R[r][c - 1] !== g ? 'l' : ''].filter(Boolean).map((x) => 'w' + x).join(' ');
        return `<div class="qn-cell ${b}" data-r="${r}" data-c="${c}" style="--rc:${COLORS[g % COLORS.length]}"></div>`;
      }).join('')).join('')}</div>`;
    timer && timer.destroy();
    timer = makeTimer($('#fg-time', stage));
    timer.start();
    $('#fg-undo', stage).onclick = undo;
    $('#fg-clear', stage).onclick = () => { if (state !== 'play') return; snapshot(); cells = cells.map((row) => row.map(() => 0)); render(); };
    $('#fg-rules', stage).onclick = () => modal({ title: 'Règles de Queens', html: RULES, buttons: [{ label: 'Compris', value: true, primary: true }] });
    bindBoard();
    sfx.click();
    render();
  }

  const snapshot = () => { history.push(cells.map((row) => [...row])); if (history.length > 200) history.shift(); };
  function undo() { if (state !== 'play' || !history.length) return; cells = history.pop(); sfx.click(); render(); }

  function bindBoard() {
    const board = $('#qn-board', stage);
    let painting = false, painted = null;
    const cellAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest && el.closest('.qn-cell'); };
    board.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.qn-cell');
      if (!el || state !== 'play') return;
      e.preventDefault();
      const r = +el.dataset.r, c = +el.dataset.c;
      snapshot();
      if (cells[r][c] === 0) { cells[r][c] = 1; painting = true; painted = new Set([r * 99 + c]); }
      else if (cells[r][c] === 1) { cells[r][c] = 2; sfx.coin(); }
      else cells[r][c] = 0;
      render();
    });
    board.addEventListener('pointermove', (e) => {
      if (!painting || state !== 'play') return;
      const el = cellAt(e);
      if (!el) return;
      const r = +el.dataset.r, c = +el.dataset.c, k = r * 99 + c;
      if (painted.has(k)) return;
      painted.add(k);
      if (cells[r][c] === 0) { cells[r][c] = 1; render(); }
    });
    const end = () => { painting = false; painted = null; };
    board.addEventListener('pointerup', end); board.addEventListener('pointerleave', end); board.addEventListener('pointercancel', end);
    board.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // reines en conflit (même ligne, colonne, zone, ou qui se touchent)
  function conflicts() {
    const n = cells.length, Q = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cells[r][c] === 2) Q.push([r, c]);
    const bad = new Set();
    for (let i = 0; i < Q.length; i++) for (let j = i + 1; j < Q.length; j++) {
      const [r1, c1] = Q[i], [r2, c2] = Q[j];
      if (r1 === r2 || c1 === c2 || puzzle.regions[r1][c1] === puzzle.regions[r2][c2] || (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1)) { bad.add(r1 * 99 + c1); bad.add(r2 * 99 + c2); }
    }
    return { Q, bad };
  }

  function render() {
    if (!alive || !puzzle) return;
    const { Q, bad } = conflicts();
    $$('.qn-cell', stage).forEach((el) => {
      const r = +el.dataset.r, c = +el.dataset.c, v = cells[r][c];
      el.classList.toggle('x', v === 1); el.classList.toggle('q', v === 2); el.classList.toggle('bad', bad.has(r * 99 + c));
      el.innerHTML = v === 2 ? crownSVG : v === 1 ? '<i class="qn-x"></i>' : '';
    });
    const info = $('#fg-info', stage);
    if (info) info.textContent = `${Q.length} / ${cells.length} reines`;
    if (state === 'play' && Q.length === cells.length && !bad.size) win();
  }

  function win() {
    state = 'done';
    timer.stop();
    const L = QUEENS_LEVELS[lv], sec = Math.round(timer.elapsed);
    const bonus = speedBonus(L.reward, sec, L.par), amount = L.reward + bonus;
    const s = wallet.stats, key = 'queensBest' + L.n, record = !s[key] || sec < s[key];
    if (record) s[key] = sec;
    wallet.freeReward('queens', amount, { Won: 1, ['Won' + L.n]: 1 }, L.n === 9 ? { feed: { txt: `a résolu une grille 9×9 de`, tail: `en ${fmtTimeLong(sec)}` } } : null);
    $('#qn-board', stage).classList.add('solved');
    sfx.win(true); coinRain(25);
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: true, title: 'Grille résolue !', amount,
        text: `${L.name} en <b>${fmtTimeLong(sec)}</b>${bonus ? ` (bonus de vitesse +${fmt(bonus)})` : ''}.${record ? ' Nouveau record !' : ` Record : ${fmtTimeLong(s[key])}.`}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de taille</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 700);
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.closest('input,textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    else if (state !== 'play' && e.key === 'Enter' && !e.target.closest('button')) start();
  };
  document.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; timer && timer.destroy(); document.removeEventListener('keydown', onKey); };
}
