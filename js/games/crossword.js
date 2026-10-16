// Mots croisés — jeu gratuit, grille générée à chaque partie, 3 niveaux.
// Clic sur une case (re-clic : change de sens), tape les lettres, flèches pour se déplacer.
import { WORDS } from './crossword-data.js';
import { generateCrossword } from './crossword-gen.js';
import { $, $$, esc, fmt, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { createGuard, judge, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';
import { makeTimer, modesHTML, bindModes, savedLevel, saveLevel, endCardHTML, fmtTimeLong } from './free-common.js';

export const CW_LEVELS = [
  { name: 'Facile', desc: '7 mots, la 1re lettre de chaque mot est donnée', words: 7, maxSize: 11, reward: 40, firstLetters: true },
  { name: 'Moyen', desc: '10 mots', words: 10, maxSize: 13, reward: 70 },
  { name: 'Difficile', desc: '14 mots, grande grille', words: 14, maxSize: 15, reward: 110 },
];
const RECENT_KEY = 'chibouk_cw_recent', RECENT_MAX = 300; // ~25 grilles sans revoir un mot
const HINT_COST = 0.1; // chaque lettre révélée retire 10 % du gain

export function mount(view, { wallet }) {
  let guard = null;
  let alive = true, lv = savedLevel('chibouk_cw_lv', 0), pz = null, fill = {}, given = new Set(), sel = null, dir = 'h', hints = 0, state = 'intro', timer = null, checked = false;
  view.innerHTML = `<div class="fg-wrap cw-wrap">
    <div class="game-head"><h1>Mots <span>croisés</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${CW_LEVELS[0].reward} à +${CW_LEVELS[2].reward} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  const key = (r, c) => r + ',' + c;
  const bestTxt = (i) => { const b = wallet.stats['crosswordBest' + i]; return b ? ` · record ${fmtTimeLong(b)}` : ''; };

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Une nouvelle grille à chaque partie</h2>
      <p>Clique sur une case et tape les lettres (sans accents). Re-clique pour changer de sens. « Vérifier » montre les erreurs gratuitement, chaque lettre révélée retire 10 % du gain.</p>
      ${modesHTML(CW_LEVELS, lv, (l, i) => `+${l.reward} ${CUR}${bestTxt(i)}`)}
      ${lockBannerHTML(wallet, 'crossword')}
      <button class="btn btn-gold btn-lg" id="fg-start" ${lockedUntil(wallet, 'crossword') ? 'disabled' : ''}>Nouvelle grille</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_cw_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    if (lockedUntil(wallet, 'crossword')) { intro(); return; }
    const L = CW_LEVELS[lv];
    // on évite les mots des dernières grilles (mémorisés sur l'appareil) pour ne pas retomber sur les mêmes
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch {}
    const avoid = new Set(recent), pool = WORDS.filter((w) => !avoid.has(w.word));
    pz = generateCrossword(pool.length >= 250 ? pool : WORDS, L);
    recent = [...recent.filter((w) => !pz.words.some((x) => x.word === w)), ...pz.words.map((x) => x.word)].slice(-RECENT_MAX);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {}
    fill = {}; given = new Set(); hints = 0; checked = false; state = 'play';
    if (L.firstLetters) for (const w of pz.words) { fill[key(w.r, w.c)] = w.word[0]; given.add(key(w.r, w.c)); }
    const first = pz.words[0];
    sel = { r: first.r, c: first.c }; dir = first.dir;
    const clueList = (d) => pz.words.filter((w) => w.dir === d).sort((a, b) => a.n - b.n).map((w) => `<li data-w="${pz.words.indexOf(w)}"><b>${w.n}.</b> ${esc(w.clue)} <small>(${w.word.length})</small></li>`).join('');
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="fg-time">0:00</span><span class="fg-info" id="cw-info"></span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="cw-check">Vérifier</button><button class="btn btn-ghost btn-sm" id="cw-hint">Révéler une lettre</button></span></div>
      <div class="cw-clue" id="cw-clue"></div>
      <div class="cw-layout"><div class="cw-gridwrap"><div class="cw-grid" id="cw-grid" style="--cols:${pz.cols};--rows:${pz.rows}">${pz.grid.map((row, r) => row.map((ch, c) => ch ? `<div class="cw-cell" data-r="${r}" data-c="${c}">${pz.numbers[key(r, c)] ? `<i>${pz.numbers[key(r, c)]}</i>` : ''}<span></span></div>` : '<div class="cw-cell blk"></div>').join('')).join('')}</div>
        <input id="cw-input" class="cw-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Lettre"></div>
        <div class="cw-clues"><h4>Horizontalement</h4><ol>${clueList('h')}</ol><h4>Verticalement</h4><ol>${clueList('v')}</ol></div></div>`;
    timer && timer.destroy();
    timer = makeTimer($('#fg-time', stage)); timer.start();
    guard && guard.destroy(); guard = createGuard(stage);
    const input = $('#cw-input', stage);
    $('#cw-grid', stage).addEventListener('click', (e) => {
      const el = e.target.closest('.cw-cell:not(.blk)');
      if (!el || state !== 'play') return;
      const r = +el.dataset.r, c = +el.dataset.c;
      if (sel && sel.r === r && sel.c === c) dir = dir === 'h' ? 'v' : 'h';
      sel = { r, c };
      if (!wordAt(r, c, dir)) dir = dir === 'h' ? 'v' : 'h';
      input.focus({ preventScroll: true });
      render();
    });
    $$('.cw-clues li', stage).forEach((li) => (li.onclick = () => { const w = pz.words[+li.dataset.w]; dir = w.dir; sel = firstEmpty(w); input.focus({ preventScroll: true }); render(); }));
    input.addEventListener('keydown', onKey);
    input.addEventListener('input', () => { const v = input.value.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, ''); input.value = ''; for (const ch of v) type(ch); });
    $('#cw-check', stage).onclick = () => { checked = true; render(); const wrong = countWrong(); sfx.click(); $('#cw-info', stage).textContent = wrong ? `${wrong} lettre${wrong > 1 ? 's' : ''} fausse${wrong > 1 ? 's' : ''}` : 'Aucune erreur pour l\'instant !'; };
    $('#cw-hint', stage).onclick = hint;
    input.focus({ preventScroll: true });
    sfx.click();
    render();
  }

  const wordAt = (r, c, d) => pz.words.find((w) => w.dir === d && (d === 'h' ? w.r === r && c >= w.c && c < w.c + w.word.length : w.c === c && r >= w.r && r < w.r + w.word.length));
  const cellsOf = (w) => Array.from({ length: w.word.length }, (_, k) => (w.dir === 'h' ? { r: w.r, c: w.c + k } : { r: w.r + k, c: w.c }));
  const firstEmpty = (w) => cellsOf(w).find((p) => !fill[key(p.r, p.c)]) || { r: w.r, c: w.c };
  const isCell = (r, c) => r >= 0 && c >= 0 && r < pz.rows && c < pz.cols && !!pz.grid[r][c];
  function countWrong() { let n = 0; for (const k in fill) { const [r, c] = k.split(',').map(Number); if (fill[k] && fill[k] !== pz.grid[r][c]) n++; } return n; }

  function type(ch) {
    if (state !== 'play' || !sel) return;
    const k = key(sel.r, sel.c);
    if (!given.has(k)) fill[k] = ch;
    // case suivante dans le mot
    const w = wordAt(sel.r, sel.c, dir);
    if (w) { const cs = cellsOf(w), i = cs.findIndex((p) => p.r === sel.r && p.c === sel.c); if (i < cs.length - 1) sel = cs[i + 1]; }
    render(); checkDone();
  }
  function onKey(e) {
    if (state !== 'play' || !sel) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); type(e.key.toUpperCase()); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const k = key(sel.r, sel.c);
      if (fill[k] && !given.has(k)) { delete fill[k]; render(); return; }
      const w = wordAt(sel.r, sel.c, dir);
      if (w) { const cs = cellsOf(w), i = cs.findIndex((p) => p.r === sel.r && p.c === sel.c); if (i > 0) { sel = cs[i - 1]; const k2 = key(sel.r, sel.c); if (!given.has(k2)) delete fill[k2]; } }
      render(); return;
    }
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (mv) {
      e.preventDefault();
      dir = mv[0] ? 'v' : 'h';
      let r = sel.r + mv[0], c = sel.c + mv[1];
      while (r >= 0 && c >= 0 && r < pz.rows && c < pz.cols && !isCell(r, c)) { r += mv[0]; c += mv[1]; }
      if (isCell(r, c)) sel = { r, c };
      if (!wordAt(sel.r, sel.c, dir)) dir = dir === 'h' ? 'v' : 'h';
      render(); return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const ws = [...pz.words].sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === 'h' ? -1 : 1)); const cur = wordAt(sel.r, sel.c, dir); const nx = ws[(ws.indexOf(cur) + (e.shiftKey ? ws.length - 1 : 1)) % ws.length]; dir = nx.dir; sel = firstEmpty(nx); render(); }
  }

  function hint() {
    if (state !== 'play' || !sel) return;
    // révèle la case sélectionnée, ou la première case vide/fausse du mot en cours
    const w = wordAt(sel.r, sel.c, dir);
    // (si le mot est déjà juste, on passe au premier mot pas encore trouvé)
    const bad = (p) => fill[key(p.r, p.c)] !== pz.grid[p.r][p.c];
    let t = [sel, ...(w ? cellsOf(w) : [])].find(bad);
    if (!t) {
      const nx = pz.words.find((x) => cellsOf(x).some(bad));
      if (!nx) return;
      dir = nx.dir; t = cellsOf(nx).find(bad);
    }
    fill[key(t.r, t.c)] = pz.grid[t.r][t.c]; given.add(key(t.r, t.c));
    sel = { r: t.r, c: t.c };
    hints++;
    sfx.click();
    render(); checkDone();
  }

  function render() {
    if (!alive || !pz) return;
    const w = sel && wordAt(sel.r, sel.c, dir);
    const inWord = new Set(w ? cellsOf(w).map((p) => key(p.r, p.c)) : []);
    $$('.cw-cell:not(.blk)', stage).forEach((el) => {
      const r = +el.dataset.r, c = +el.dataset.c, k = key(r, c), v = fill[k] || '';
      el.querySelector('span').textContent = v;
      el.classList.toggle('sel', !!sel && sel.r === r && sel.c === c);
      el.classList.toggle('word', inWord.has(k));
      el.classList.toggle('given', given.has(k));
      el.classList.toggle('bad', checked && !!v && v !== pz.grid[r][c]);
    });
    $$('.cw-clues li', stage).forEach((li) => { const x = pz.words[+li.dataset.w]; li.classList.toggle('on', x === w); li.classList.toggle('ok', cellsOf(x).every((p) => fill[key(p.r, p.c)] === pz.grid[p.r][p.c])); });
    const cl = $('#cw-clue', stage);
    if (cl) cl.innerHTML = w ? `<b>${w.n} ${w.dir === 'h' ? 'horizontal' : 'vertical'}</b> ${esc(w.clue)} <small>(${w.word.length} lettres)</small>` : '';
    const total = Object.keys(pz.numbers).length && $$('.cw-cell:not(.blk)', stage).length, filled = Object.values(fill).filter(Boolean).length;
    const info = $('#cw-info', stage);
    if (info && !checked) info.textContent = `${filled} / ${total} lettres${hints ? ` · ${hints} révélée${hints > 1 ? 's' : ''}` : ''}`;
    if (checked && info && countWrong() === 0) checked = false;
  }

  function checkDone() {
    const cellsAll = $$('.cw-cell:not(.blk)', stage);
    const full = cellsAll.every((el) => fill[key(+el.dataset.r, +el.dataset.c)]);
    if (!full) return;
    if (countWrong()) { $('#cw-info', stage).textContent = 'Grille pleine, mais il reste des erreurs (Vérifier pour les voir)'; return; }
    win();
  }

  function win() {
    state = 'done';
    timer.stop();
    const L = CW_LEVELS[lv], sec = Math.round(timer.elapsed);
    const amount = Math.max(0, Math.round(L.reward * (1 - HINT_COST * hints)));
    // contrôle fair-play avant toute récompense
    let v = judge(guard, { minActions: Math.floor(($$('.cw-cell:not(.blk)', stage).length - given.size) * 0.8), cheatSec: Math.round(($$('.cw-cell:not(.blk)', stage).length - given.size) * 0.12 * 10) / 10, noRobot: true }); guard = null;
    if (v.flag !== 'ok') {
      let pn = null;
      if (v.flag === 'cheat') { pn = punish(wallet, 'crossword', lv, v, amount); sfx.lose(); } else tooFast(wallet, 'crossword', lv, v);
      stage.insertAdjacentHTML('beforeend', refusedHTML(v, pn));
      $('[data-again]', stage).onclick = v.flag === 'cheat' ? intro : start;
      return;
    }
    const s = wallet.stats, k = 'crosswordBest' + lv, record = !hints && (!s[k] || sec < s[k]);
    if (record) s[k] = sec;
    wallet.freeReward('crossword', amount, { Won: 1, ['Won' + lv]: 1, Hints: hints, ...(hints ? {} : { Clean: 1, ...(lv === 2 ? { CleanHard: 1 } : {}) }) }, { ...(lv === 2 && record ? { feed: { txt: 'a battu son record aux', tail: `(difficile) : ${fmtTimeLong(sec)}` } } : {}), log: { lv, sec: v.sec, actions: v.actions, hints } });
    $('#cw-grid', stage).classList.add('solved');
    sfx.win(true); coinRain(20);
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: true, title: 'Grille complète !', amount,
        text: `${L.name} en <b>${fmtTimeLong(sec)}</b>${hints ? ` avec ${hints} lettre${hints > 1 ? 's' : ''} révélée${hints > 1 ? 's' : ''}` : ' sans aide'}.${record ? ' Nouveau record !' : ''}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 600);
  }

  intro();
  return () => { alive = false; timer && timer.destroy(); guard && guard.destroy(); };
}
