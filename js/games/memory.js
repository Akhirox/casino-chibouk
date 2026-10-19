// Memory — jeu gratuit : retrouver toutes les paires de cartes. 3 niveaux, gain selon la précision.
import { $, $$, fmt, modal, coinRain, CUR } from '../ui.js';
import { icon, monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { createGuard, judge, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';
import { makeTimer, modesHTML, bindModes, savedLevel, saveLevel, endCardHTML, fmtTimeLong } from './free-common.js';

export const MEMORY_LEVELS = [
  { name: 'Facile', cols: 4, rows: 4, reward: 30, desc: '8 paires' },
  { name: 'Moyen', cols: 6, rows: 4, reward: 60, desc: '12 paires' },
  { name: 'Difficile', cols: 6, rows: 6, reward: 100, desc: '18 paires' },
];
// Une icône et une couleur par paire
const FACES = [['banana', '#ffd23f'], ['star', '#f5c542'], ['bolt', '#ffb02e'], ['trophy', '#e6b88a'], ['fire', '#ff6b3d'], ['globe', '#2fb1ff'],
  ['film', '#c77dff'], ['flag', '#ff4d5e'], ['medal', '#cd7f32'], ['gift', '#3ddc84'], ['rocket', '#7fd1ff'], ['bulb', '#fff1a1'],
  ['dice', '#eaf2ec'], ['wheel', '#ff8a3d'], ['queens', '#f2a65a'], ['tango', '#7fb2ff'], ['snake', '#2fa866'], ['vault', '#c0c9d0'],
  ['shop', '#f28b82'], ['pinpoint', '#ff4d5e']];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Bonus de précision : +50 % si peu d'erreurs (au plus 60 % de coups en trop)
export const memoryBonus = (L, moves) => (moves <= Math.ceil((L.cols * L.rows) / 2 * 1.6) ? Math.round(L.reward * 0.5) : 0);

export function mount(view, { wallet }) {
  let guard = null;
  let alive = true, lv = savedLevel('chibouk_memory_lv', 0), deck = [], open = [], found = 0, moves = 0, lock = false, state = 'intro', timer = null;
  view.innerHTML = `<div class="fg-wrap mm-wrap">
    <div class="game-head"><h1>Mem<span>ory</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${MEMORY_LEVELS[0].reward} à +${Math.round(MEMORY_LEVELS[2].reward * 1.5)} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  const bestTxt = (i) => { const b = wallet.stats['memoryBest' + i]; return b ? ` · record ${b} coups` : ''; };

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Retrouve toutes les paires</h2>
      <p>Retourne deux cartes à la fois. Si elles sont identiques, elles restent face visible. <b>+50 %</b> si tu termines avec peu d'erreurs.</p>
      ${modesHTML(MEMORY_LEVELS, lv, (l, i) => `+${l.reward} ${CUR} · bonus en ${Math.ceil((l.cols * l.rows) / 2 * 1.6)} coups max${bestTxt(i)}`, 'memory')}
      ${lockBannerHTML(wallet, 'memory')}
      <button class="btn btn-gold btn-lg" id="fg-start" ${lockedUntil(wallet, 'memory') ? 'disabled' : ''}>Jouer</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_memory_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    if (lockedUntil(wallet, 'memory')) { intro(); return; }
    const L = MEMORY_LEVELS[lv], pairs = (L.cols * L.rows) / 2;
    const faces = shuffle([...FACES]).slice(0, pairs);
    deck = shuffle([...faces, ...faces].map((f, i) => ({ id: i, face: f[0], color: f[1], done: false })));
    open = []; found = 0; moves = 0; lock = false; state = 'play';
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="fg-time">0:00</span><span class="fg-info" id="mm-info"></span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="mm-restart">Recommencer</button></span></div>
      <div class="mm-board" style="--cols:${L.cols}">${deck.map((c, i) => `<button type="button" class="mm-card" data-i="${i}" aria-label="carte"><span class="mm-inner"><span class="mm-back">${monkeySVG({})}</span><span class="mm-front" style="--fc:${c.color}">${icon(c.face)}</span></span></button>`).join('')}</div>`;
    timer && timer.destroy();
    timer = makeTimer($('#fg-time', stage));
    guard && guard.destroy(); guard = createGuard(stage);
    $('#mm-restart', stage).onclick = start;
    stage.querySelector('.mm-board').addEventListener('click', (e) => { const b = e.target.closest('.mm-card'); if (b) flip(+b.dataset.i); });
    info();
  }

  function info() { const el = $('#mm-info', stage); if (el) el.textContent = `${found} / ${deck.length / 2} paires · ${moves} coup${moves > 1 ? 's' : ''}`; }

  function flip(i) {
    const c = deck[i], el = stage.querySelector(`.mm-card[data-i="${i}"]`);
    if (state !== 'play' || lock || c.done || open.includes(i)) return;
    if (!timer.running) timer.start();
    el.classList.add('up');
    sfx.flip ? sfx.flip() : sfx.click();
    open.push(i);
    if (open.length < 2) return;
    moves++;
    const [a, b] = open, A = deck[a], Bc = deck[b];
    if (A.face === Bc.face) {
      A.done = Bc.done = true; found++; open = [];
      setTimeout(() => { if (!alive) return; [a, b].forEach((k) => stage.querySelector(`.mm-card[data-i="${k}"]`).classList.add('done')); }, 250);
      sfx.coin();
      info();
      if (found === deck.length / 2) setTimeout(win, 500);
    } else {
      lock = true;
      info();
      setTimeout(() => {
        if (!alive) return;
        [a, b].forEach((k) => stage.querySelector(`.mm-card[data-i="${k}"]`).classList.remove('up'));
        open = []; lock = false;
      }, 850);
    }
  }

  function win() {
    if (!alive || state !== 'play') return;
    state = 'done';
    timer.stop();
    const L = MEMORY_LEVELS[lv], sec = Math.round(timer.elapsed), bonus = memoryBonus(L, moves), amount = L.reward + bonus;
    // contrôle fair-play avant toute récompense
    let v = judge(guard, { minActions: deck.length, cheatSec: Math.round(deck.length / 2 * 0.6 * 10) / 10 }); guard = null;
    // aucune erreur sur 8 paires ou plus : 1 chance sur 2 millions sans voir les cartes (elles sont lisibles dans le code de la page)
    if (v.flag === 'ok' && moves === deck.length / 2 && deck.length >= 16) v = { ...v, flag: 'cheat', reason: `aucune erreur sur ${deck.length / 2} paires (une chance sur plusieurs millions sans tricher)` };
    if (v.flag !== 'ok') {
      let pn = null;
      if (v.flag === 'cheat') { pn = punish(wallet, 'memory', lv, v, amount); sfx.lose(); } else tooFast(wallet, 'memory', lv, v);
      stage.insertAdjacentHTML('beforeend', refusedHTML(v, pn));
      $('[data-again]', stage).onclick = v.flag === 'cheat' ? intro : start;
      return;
    }
    const s = wallet.stats, key = 'memoryBest' + lv, record = !s[key] || moves < s[key];
    if (record) s[key] = moves;
    wallet.freeReward('memory', amount, { Won: 1, ['Won' + lv]: 1, Moves: moves }, { ...(lv === 2 && record ? { feed: { txt: 'a battu son record au', tail: `difficile : ${moves} coups` } } : {}), log: { lv, sec: v.sec, actions: v.actions, fastShare: v.fastShare, moves } });
    sfx.win(true); coinRain(20);
    stage.insertAdjacentHTML('beforeend', endCardHTML({ win: true, title: 'Toutes les paires !', amount,
      text: `${L.name} en <b>${moves} coups</b> et ${fmtTimeLong(sec)}${bonus ? ` (bonus de précision +${fmt(bonus)})` : ''}.${record ? ' Nouveau record !' : ` Record : ${s[key]} coups.`}`,
      extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
    $('[data-again]', stage).onclick = start;
    $('[data-modes]', stage).onclick = intro;
    $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const onKey = (e) => { if (state !== 'play' && e.key === 'Enter' && !e.target.closest('button,input') && !document.querySelector('.modal-backdrop')) start(); };
  document.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; timer && timer.destroy(); guard && guard.destroy(); document.removeEventListener('keydown', onKey); };
}
