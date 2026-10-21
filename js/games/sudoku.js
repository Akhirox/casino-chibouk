// Sudoku — jeu gratuit, 3 niveaux. Clavier : chiffres, flèches, Retour arrière, N pour les notes.
import { generateSudoku, SUDOKU_LEVELS } from './sudoku-gen.js';
import { $, $$, fmt, modal, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { createGuard, judge, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';
import { makeTimer, modesHTML, bindModes, savedLevel, saveLevel, endCardHTML, speedBonus, fmtTimeLong } from './free-common.js';
import { submitRecord, recordEndHTML, fmtCs } from '../records.js';

export const SUDOKU_INFO = [
  { ...SUDOKU_LEVELS[0], desc: '40 chiffres donnés', reward: 80, par: 360 },
  { ...SUDOKU_LEVELS[1], desc: '32 chiffres donnés', reward: 160, par: 720 },
  { ...SUDOKU_LEVELS[2], desc: '25 chiffres donnés, bon courage', reward: 300, par: 1200 },
];
// Fair-play (horloge réelle) : en dessous de fastSec, pas de récompense ; en dessous de cheatSec, c'est une triche évidente.
// Repères : même en connaissant la réponse, saisir une case (la choisir + taper le chiffre) prend au moins ~0,5 s,
// soit 20 à 28 s rien que pour remplir 41 à 56 cases ; les meilleurs joueurs mettent plusieurs minutes sur une grille difficile.
export const SUDOKU_FAIR = SUDOKU_LEVELS.map((l, i) => {
  const empties = 81 - l.clues;
  return { empties, minActions: empties, cheatSec: Math.round(empties * 0.4), fastSec: [40, 75, 120][i] };
});
const peersOf = (i) => { const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3), p = new Set();
  for (let k = 0; k < 9; k++) { p.add(r * 9 + k); p.add(k * 9 + c); p.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3)); }
  p.delete(i); return [...p]; };
const PEERS = [...Array(81).keys()].map(peersOf);

export function mount(view, { wallet }) {
  let alive = true, lv = savedLevel('chibouk_sudoku_lv', 0), pz = null, g = null, notes = null, sel = -1, noteMode = false, state = 'intro', history = [], timer = null, guard = null;
  view.innerHTML = `<div class="fg-wrap sd-wrap">
    <div class="game-head"><h1>Su<span>doku</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${SUDOKU_INFO[0].reward} à +${SUDOKU_INFO[2].reward} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  const bestTxt = (i) => { const b = wallet.stats['sudokuBest' + i]; return b ? ` · record ${fmtTimeLong(b)}` : ''; };

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Le bon vieux Sudoku</h2>
      <p>Chaque ligne, chaque colonne et chaque carré de 3×3 contient les chiffres de 1 à 9. <b>+50 %</b> si tu bats le temps de référence.</p>
      ${modesHTML(SUDOKU_INFO, lv, (l, i) => `+${l.reward} ${CUR} · bonus sous ${Math.round(l.par / 60)} min${bestTxt(i)}`, 'sudoku')}
      ${lockBannerHTML(wallet, 'sudoku')}
      <button class="btn btn-gold btn-lg" id="fg-start" ${lockedUntil(wallet, 'sudoku') ? 'disabled' : ''}>Nouvelle grille</button>
      <p class="muted fair-note">Grille résolue en moins de ${SUDOKU_FAIR[lv].fastSec} s : pas de récompense. Solveurs et scripts sont détectés et sanctionnés.</p></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_sudoku_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    if (lockedUntil(wallet, 'sudoku')) { intro(); return; }
    pz = generateSudoku(lv);
    g = [...pz.puzzle];
    notes = Array.from({ length: 81 }, () => new Set());
    sel = g.findIndex((v) => !v); noteMode = false; history = []; state = 'play';
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="fg-time">0:00,00</span><span class="fg-info">${SUDOKU_INFO[lv].name}</span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="fg-undo">Annuler</button><button class="btn btn-ghost btn-sm" id="fg-rules">Aide</button></span></div>
      <div class="sd-layout"><div class="sd-board" id="sd-board">${[...Array(81).keys()].map((i) => `<div class="sd-cell ${pz.puzzle[i] ? 'given' : ''} ${i % 9 === 2 || i % 9 === 5 ? 'br' : ''} ${Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? 'bb' : ''}" data-i="${i}"></div>`).join('')}</div>
      <div class="sd-pad"><div class="sd-nums">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" data-d="${d}"><b>${d}</b><small></small></button>`).join('')}</div>
        <div class="sd-acts"><button type="button" class="btn btn-ghost" id="sd-note" title="Touche N">✎ Notes</button><button type="button" class="btn btn-ghost" id="sd-erase">Effacer</button></div></div></div>`;
    timer && timer.destroy();
    timer = makeTimer($('#fg-time', stage)); timer.start();
    guard && guard.destroy();
    guard = createGuard(stage);
    $('#sd-board', stage).addEventListener('click', (e) => { const el = e.target.closest('.sd-cell'); if (el && state === 'play') { sel = +el.dataset.i; render(); } });
    $$('.sd-nums button', stage).forEach((b) => (b.onclick = () => input(+b.dataset.d)));
    $('#sd-erase', stage).onclick = () => input(0);
    $('#sd-note', stage).onclick = toggleNotes;
    $('#fg-undo', stage).onclick = undo;
    $('#fg-rules', stage).onclick = () => modal({ title: 'Sudoku', html: `<ul class="muted"><li>Remplis la grille pour que chaque <b>ligne</b>, chaque <b>colonne</b> et chaque <b>carré 3×3</b> contienne les chiffres de 1 à 9, une seule fois.</li>
      <li>Clique sur une case puis sur un chiffre (ou tape-le au clavier). Les chiffres en double s'affichent en rouge.</li>
      <li><b>Notes</b> (touche N) : pour noter les chiffres possibles en petit. Elles s'effacent toutes seules quand tu poses le chiffre dans la même ligne, colonne ou carré.</li>
      <li>Flèches pour te déplacer, Retour arrière pour effacer, Ctrl+Z pour annuler.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
    sfx.click();
    render();
  }

  const snapshot = () => { history.push({ g: [...g], notes: notes.map((s) => new Set(s)) }); if (history.length > 300) history.shift(); };
  function undo() { if (state !== 'play' || !history.length) return; const h = history.pop(); g = h.g; notes = h.notes; sfx.click(); render(); }
  function toggleNotes() { noteMode = !noteMode; render(); }

  function input(d) {
    if (state !== 'play' || sel < 0 || pz.puzzle[sel]) return;
    snapshot();
    if (d === 0) { g[sel] = 0; notes[sel].clear(); }
    else if (noteMode) { if (g[sel]) return; notes[sel].has(d) ? notes[sel].delete(d) : notes[sel].add(d); }
    else {
      g[sel] = g[sel] === d ? 0 : d;
      if (g[sel]) { notes[sel].clear(); PEERS[sel].forEach((p) => notes[p].delete(d)); }
    }
    sfx.click();
    render();
  }

  function render() {
    if (!alive || !pz) return;
    const conflict = new Set();
    for (let i = 0; i < 81; i++) if (g[i]) for (const p of PEERS[i]) if (g[p] === g[i]) { conflict.add(i); conflict.add(p); }
    const sv = sel >= 0 ? g[sel] : 0, selPeers = sel >= 0 ? new Set(PEERS[sel]) : new Set();
    $$('.sd-cell', stage).forEach((el) => {
      const i = +el.dataset.i, v = g[i];
      el.innerHTML = v ? `<span>${v}</span>` : notes[i].size ? `<div class="sd-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i>${notes[i].has(d) ? d : ''}</i>`).join('')}</div>` : '';
      el.classList.toggle('sel', i === sel);
      el.classList.toggle('peer', selPeers.has(i));
      el.classList.toggle('same', !!sv && v === sv && i !== sel);
      el.classList.toggle('bad', conflict.has(i) && !pz.puzzle[i]);
      el.classList.toggle('badg', conflict.has(i) && !!pz.puzzle[i]);
    });
    const count = {};
    g.forEach((v) => { if (v) count[v] = (count[v] || 0) + 1; });
    $$('.sd-nums button', stage).forEach((b) => { const d = +b.dataset.d, left = 9 - (count[d] || 0); b.querySelector('small').textContent = left > 0 ? left : ''; b.classList.toggle('done', left <= 0); });
    $('#sd-note', stage).classList.toggle('on', noteMode);
    if (state === 'play' && g.every((v, i) => v === pz.solution[i])) win();
  }

  function win() {
    state = 'done';
    timer.stop();
    const L = SUDOKU_INFO[lv], sec = Math.round(timer.elapsed);
    const bonus = speedBonus(L.reward, sec, L.par), amount = L.reward + bonus;
    // contrôle fair-play avant toute récompense
    const v = judge(guard, SUDOKU_FAIR[lv]); guard = null;
    if (v.flag !== 'ok') {
      sel = -1; render();
      let p = null;
      if (v.flag === 'cheat') { p = punish(wallet, 'sudoku', lv, v, amount); sfx.lose(); } else tooFast(wallet, 'sudoku', lv, v);
      stage.insertAdjacentHTML('beforeend', refusedHTML(v, p));
      $('[data-again]', stage).onclick = v.flag === 'cheat' ? intro : start;
      return;
    }
    const s = wallet.stats, key = 'sudokuBest' + lv, record = !s[key] || sec < s[key];
    if (record) s[key] = sec;
    sel = -1; render();
    wallet.freeReward('sudoku', amount, { Won: 1, ['Won' + lv]: 1 }, { ...(lv === 2 && record ? { feed: { txt: 'a battu son record au', tail: `difficile : ${fmtTimeLong(sec)}` } } : {}), log: { lv, sec: v.sec, actions: v.actions, fastShare: v.fastShare } });
    const recRes = submitRecord(wallet, 'sudoku', { l: lv, t: timer.elapsed * 1000 }); // record : au centième de seconde
    $('#sd-board', stage).classList.add('solved');
    sfx.win(true); coinRain(lv === 2 ? 45 : 25);
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: true, title: 'Sudoku résolu !', amount,
        text: `${L.name} en <b>${fmtCs(timer.elapsed * 1000)}</b>${bonus ? ` (bonus de vitesse +${fmt(bonus)})` : ''}.<br>${recordEndHTML('sudoku', recRes, wallet)}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 700);
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.closest('input,textarea')) return;
    if (state !== 'play') { if (e.key === 'Enter' && !e.target.closest('button')) start(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
    if (/^[1-9]$/.test(e.key)) { input(+e.key); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); input(0); return; }
    if (e.key === 'n' || e.key === 'N') { toggleNotes(); return; }
    const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (mv) {
      e.preventDefault();
      if (sel < 0) sel = 0;
      const r = Math.floor(sel / 9), c = sel % 9;
      const nr = (r + (mv === -9 ? -1 : mv === 9 ? 1 : 0) + 9) % 9, nc = (c + (mv === -1 ? -1 : mv === 1 ? 1 : 0) + 9) % 9;
      sel = nr * 9 + nc; render();
    }
  };
  document.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; timer && timer.destroy(); guard && guard.destroy(); document.removeEventListener('keydown', onKey); };
}
