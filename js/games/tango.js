// Tango — jeu gratuit de logique : remplir la grille 6×6 de soleils et de lunes.
// Autant de soleils que de lunes par ligne et colonne, jamais 3 identiques d'affilée,
// « = » : cases identiques, « × » : cases opposées. Clic : soleil → lune → vide.
import { generateTango, N } from './tango-gen.js';
import { $, $$, fmt, modal, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { createGuard, judge, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';
import { makeTimer, modesHTML, bindModes, savedLevel, saveLevel, endCardHTML, speedBonus, fmtTimeLong } from './free-common.js';
import { submitRecord, recordEndHTML, fmtCs } from '../records.js';

export const TANGO_LEVELS = [
  { name: 'Facile', desc: 'Beaucoup de cases déjà remplies', reward: 40, par: 90 },
  { name: 'Moyen', desc: 'Il faut s\'aider des signes', reward: 70, par: 150 },
  { name: 'Difficile', desc: 'Presque tout est à déduire', reward: 100, par: 210 },
];
export const SUN = '<svg viewBox="0 0 24 24" class="tg-sun" aria-label="soleil"><circle cx="12" cy="12" r="6.2" fill="#ffb627"/><g stroke="#ffb627" stroke-width="2" stroke-linecap="round"><path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/></g></svg>';
export const MOON = '<svg viewBox="0 0 24 24" class="tg-moon" aria-label="lune"><path d="M15.5 3.2a9 9 0 1 0 5.3 13.4A7.2 7.2 0 0 1 15.5 3.2z" fill="#7fb2ff"/></svg>';
const RULES = `<ul class="muted">
  <li>Remplis toute la grille avec des <b>soleils</b> et des <b>lunes</b>.</li>
  <li>Chaque ligne et chaque colonne contient <b>3 soleils et 3 lunes</b>.</li>
  <li>Jamais <b>plus de 2 symboles identiques</b> d'affilée (ni en ligne, ni en colonne).</li>
  <li><b>=</b> entre deux cases : elles ont le même symbole. <b>×</b> : elles ont des symboles opposés.</li>
  <li>Clic : soleil → lune → vide. Les cases grisées sont données au départ. Une seule solution par grille.</li></ul>`;

export function mount(view, { wallet }) {
  let guard = null;
  let alive = true, lv = savedLevel('chibouk_tango_lv', 1), pz = null, g = null, state = 'intro', history = [], timer = null;
  view.innerHTML = `<div class="fg-wrap tg-wrap">
    <div class="game-head"><h1>Tan<span>go</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${TANGO_LEVELS[0].reward} à +${TANGO_LEVELS[2].reward} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  const bestTxt = (i) => { const b = wallet.stats['tangoBest' + i]; return b ? ` · record ${fmtTimeLong(b)}` : ''; };

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card"><div class="tg-intro">${SUN}${MOON}${SUN}${MOON}</div>
      <h2>Soleils et lunes, à parts égales</h2>
      <p>3 de chaque par ligne et par colonne, jamais 3 pareils d'affilée, et respecte les signes <b>=</b> et <b>×</b>. <b>+50 %</b> si tu bats le temps de référence.</p>
      ${modesHTML(TANGO_LEVELS, lv, (l, i) => `+${l.reward} ${CUR} · bonus sous ${fmtTimeLong(l.par)}${bestTxt(i)}`, 'tango')}
      ${lockBannerHTML(wallet, 'tango')}
      <button class="btn btn-gold btn-lg" id="fg-start" ${lockedUntil(wallet, 'tango') ? 'disabled' : ''}>Nouvelle grille</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_tango_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    if (lockedUntil(wallet, 'tango')) { intro(); return; }
    pz = generateTango(lv);
    g = pz.givens.map((row) => [...row]);
    history = [];
    state = 'play';
    const signAt = {};
    for (const k of pz.cons) signAt[`${k.r1},${k.c1},${k.r2 === k.r1 ? 'h' : 'v'}`] = k;
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="fg-time">0:00,00</span><span class="fg-info" id="fg-info"></span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="fg-undo">Annuler</button><button class="btn btn-ghost btn-sm" id="fg-clear">Tout effacer</button><button class="btn btn-ghost btn-sm" id="fg-rules">Règles</button></span></div>
      <div class="tg-board" id="tg-board">${[...Array(N * N).keys()].map((i) => {
        const r = Math.floor(i / N), c = i % N, h = signAt[`${r},${c},h`], v = signAt[`${r},${c},v`];
        return `<div class="tg-cell ${pz.givens[r][c] !== -1 ? 'given' : ''}" data-r="${r}" data-c="${c}"><span class="tg-sym"></span>
          ${h ? `<b class="tg-sign h" data-k="${r},${c},h">${h.t === '=' ? '=' : '×'}</b>` : ''}${v ? `<b class="tg-sign v" data-k="${r},${c},v">${v.t === '=' ? '=' : '×'}</b>` : ''}</div>`;
      }).join('')}</div>`;
    timer && timer.destroy();
    timer = makeTimer($('#fg-time', stage)); timer.start();
    guard && guard.destroy(); guard = createGuard(stage);
    $('#fg-undo', stage).onclick = undo;
    $('#fg-clear', stage).onclick = () => { if (state !== 'play') return; snapshot(); g = pz.givens.map((row) => [...row]); render(); };
    $('#fg-rules', stage).onclick = () => modal({ title: 'Règles du Tango', html: RULES, buttons: [{ label: 'Compris', value: true, primary: true }] });
    const board = $('#tg-board', stage);
    board.addEventListener('click', (e) => {
      const el = e.target.closest('.tg-cell');
      if (!el || state !== 'play' || el.classList.contains('given')) return;
      const r = +el.dataset.r, c = +el.dataset.c;
      snapshot();
      g[r][c] = g[r][c] === -1 ? 0 : g[r][c] === 0 ? 1 : -1;
      sfx.click();
      render();
    });
    board.addEventListener('contextmenu', (e) => {
      const el = e.target.closest('.tg-cell');
      if (!el || state !== 'play' || el.classList.contains('given')) return;
      e.preventDefault();
      const r = +el.dataset.r, c = +el.dataset.c;
      snapshot();
      g[r][c] = g[r][c] === -1 ? 1 : g[r][c] === 1 ? 0 : -1; // clic droit : dans l'autre sens
      render();
    });
    sfx.click();
    render();
  }

  const snapshot = () => { history.push(g.map((row) => [...row])); if (history.length > 300) history.shift(); };
  function undo() { if (state !== 'play' || !history.length) return; g = history.pop(); sfx.click(); render(); }

  // erreurs visibles : 3 d'affilée, trop de symboles dans une ligne/colonne, signe non respecté
  function errors() {
    const bad = new Set(), badSign = new Set(), half = N / 2;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = g[r][c];
      if (v === -1) continue;
      if (c + 2 < N && g[r][c + 1] === v && g[r][c + 2] === v) [0, 1, 2].forEach((k) => bad.add(r * N + c + k));
      if (r + 2 < N && g[r + 1][c] === v && g[r + 2][c] === v) [0, 1, 2].forEach((k) => bad.add((r + k) * N + c));
    }
    for (let i = 0; i < N; i++) for (const v of [0, 1]) {
      if (g[i].filter((x) => x === v).length > half) for (let c = 0; c < N; c++) if (g[i][c] === v) bad.add(i * N + c);
      if (g.filter((row) => row[i] === v).length > half) for (let r = 0; r < N; r++) if (g[r][i] === v) bad.add(r * N + i);
    }
    for (const k of pz.cons) {
      const a = g[k.r1][k.c1], b = g[k.r2][k.c2];
      if (a === -1 || b === -1) continue;
      if (k.t === '=' ? a !== b : a === b) badSign.add(`${k.r1},${k.c1},${k.r2 === k.r1 ? 'h' : 'v'}`);
    }
    return { bad, badSign };
  }

  function render() {
    if (!alive || !pz) return;
    const { bad, badSign } = errors();
    let filled = 0;
    $$('.tg-cell', stage).forEach((el) => {
      const r = +el.dataset.r, c = +el.dataset.c, v = g[r][c];
      if (v !== -1) filled++;
      el.querySelector('.tg-sym').innerHTML = v === 0 ? SUN : v === 1 ? MOON : '';
      el.classList.toggle('bad', bad.has(r * N + c));
    });
    $$('.tg-sign', stage).forEach((s) => s.classList.toggle('bad', badSign.has(s.dataset.k)));
    $('#fg-info', stage).textContent = `${filled} / ${N * N} cases`;
    if (state === 'play' && filled === N * N && !bad.size && !badSign.size) win();
  }

  function win() {
    state = 'done';
    timer.stop();
    const L = TANGO_LEVELS[lv], sec = Math.round(timer.elapsed);
    const bonus = speedBonus(L.reward, sec, L.par), amount = L.reward + bonus;
    // contrôle fair-play avant toute récompense
    let v = judge(guard, { minActions: pz.givens.flat().filter((x) => x === -1).length, cheatSec: Math.round(pz.givens.flat().filter((x) => x === -1).length * 0.2 * 10) / 10 }); guard = null;
    if (v.flag !== 'ok') {
      let pn = null;
      if (v.flag === 'cheat') { pn = punish(wallet, 'tango', lv, v, amount); sfx.lose(); } else tooFast(wallet, 'tango', lv, v);
      stage.insertAdjacentHTML('beforeend', refusedHTML(v, pn));
      $('[data-again]', stage).onclick = v.flag === 'cheat' ? intro : start;
      return;
    }
    const s = wallet.stats, key = 'tangoBest' + lv, record = !s[key] || sec < s[key];
    if (record) s[key] = sec;
    wallet.freeReward('tango', amount, { Won: 1, ['Won' + lv]: 1 }, { ...(lv === 2 && record ? { feed: { txt: 'a battu son record au', tail: `difficile : ${fmtTimeLong(sec)}` } } : {}), log: { lv, sec: v.sec, actions: v.actions, fastShare: v.fastShare } });
    const recRes = submitRecord(wallet, 'tango', { l: lv, t: timer.elapsed * 1000 }); // record : au centième de seconde
    $('#tg-board', stage).classList.add('solved');
    sfx.win(true); coinRain(20);
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: true, title: 'Grille résolue !', amount,
        text: `${L.name} en <b>${fmtCs(timer.elapsed * 1000)}</b>${bonus ? ` (bonus de vitesse +${fmt(bonus)})` : ''}.<br>${recordEndHTML('tango', recRes, wallet)}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
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
  return () => { alive = false; timer && timer.destroy(); guard && guard.destroy(); document.removeEventListener('keydown', onKey); };
}
