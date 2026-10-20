// Frappe éclair — jeu gratuit façon « 10 fast fingers » : 60 secondes pour taper un maximum de mots.
// Espace (ou Entrée) valide le mot. Des Brundles par mot juste ; le score = mots justes par minute.
import { WORDS_EASY, WORDS_NORMAL, WORDS_HARD } from './typing-data.js';
import { modesHTML, bindModes, savedLevel, saveLevel, endCardHTML } from './free-common.js';
import { randInt } from './slots-math.js';
import { $, $$, esc, fmt, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';
import { createGuard, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';

export const TYPING_LEVELS = [
  { name: 'Facile', desc: 'Mots courts, sans accents', words: WORDS_EASY, per: 2 },
  { name: 'Normal', desc: 'Mots de tous les jours', words: WORDS_NORMAL, per: 3 },
  { name: 'Difficile', desc: 'Mots longs, accents et traits d\'union', words: WORDS_HARD, per: 5 },
];
const DURATION = 60;
const norm = (s) => s.normalize('NFC');

export function mount(view, { wallet }) {
  let alive = true, lv = savedLevel('chibouk_typing_lv'), state = 'intro';
  let words = [], idx = 0, ok = 0, ko = 0, keys = 0, t0 = 0, iv = null, guard = null, results = [];
  view.innerHTML = `<div class="ty-wrap">
    <div class="game-head"><h1>Frappe <span>éclair</span></h1><div class="actions"><span class="gc-tag">Gratuit · +2 à +5 ${CUR} par mot juste</span></div></div>
    <div class="ty-stage" id="ty-stage"></div></div>`;
  const stage = $('#ty-stage', view);

  function intro() {
    state = 'intro';
    const best = (i) => (wallet.stats['typingBest' + i] ? ` · record ${wallet.stats['typingBest' + i]} mots/min` : '');
    stage.innerHTML = `<div class="qz-card ty-intro">
      <div class="ty-logo">${'ABCDE'.split('').map((c) => `<kbd>${c}</kbd>`).join('')}</div>
      <h2>${DURATION} secondes pour taper un maximum de mots</h2>
      <p>Tape le mot surligné puis appuie sur <kbd>Espace</kbd>. Un mot juste rapporte des Brundles, une faute ne coûte rien mais ne rapporte rien.<br>Le chrono démarre à ta première touche.</p>
      ${modesHTML(TYPING_LEVELS, lv, (l, i) => `+${l.per} ${CUR} par mot${best(i)}`, 'typing')}
      ${lockBannerHTML(wallet, 'typing')}
      <button class="btn btn-gold btn-lg" id="ty-start" ${lockedUntil(wallet, 'typing') ? 'disabled' : ''}>Commencer</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_typing_lv', i); sfx.click(); intro(); });
    $('#ty-start', stage).onclick = start;
  }

  function draw() {
    const L = TYPING_LEVELS[lv];
    const out = [];
    for (let i = 0; i < 400; i++) { let w; do { w = L.words[randInt(L.words.length)]; } while (out.length && w === out[out.length - 1]); out.push(w); }
    return out;
  }

  function start() {
    if (lockedUntil(wallet, 'typing')) { intro(); return; }
    state = 'ready'; words = draw(); idx = 0; ok = 0; ko = 0; keys = 0; t0 = 0; results = [];
    clearInterval(iv);
    stage.innerHTML = `<div class="ty-play">
      <div class="ty-hud"><div><span>Temps</span><b id="ty-time">${DURATION}</b></div><div><span>Mots justes</span><b id="ty-ok" class="pos">0</b></div><div><span>Fautes</span><b id="ty-ko" class="neg">0</b></div><div><span>Gain</span><b id="ty-gain" class="gold">0</b></div></div>
      <div class="ty-box"><div class="ty-words" id="ty-words">${words.map((w, i) => `<span data-i="${i}">${esc(w)}</span>`).join(' ')}</div></div>
      <input id="ty-in" class="ty-in" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Tape le mot" placeholder="Tape ici…">
      <div class="ty-tip muted">Espace pour valider · Échap pour recommencer</div></div>`;
    guard && guard.destroy(); guard = createGuard(stage);
    const inp = $('#ty-in', stage);
    ['paste', 'drop'].forEach((t) => inp.addEventListener(t, (e) => e.preventDefault()));
    inp.addEventListener('input', onInput);
    inp.addEventListener('keydown', onKeyDown);
    mark();
    setTimeout(() => alive && inp.focus(), 30);
  }

  const span = (i) => $(`#ty-words [data-i="${i}"]`, stage);
  function mark() {
    const s = span(idx); if (!s) return;
    s.classList.add('cur');
    // la ligne en cours reste en haut de la zone visible
    const box = $('#ty-words', stage);
    const top = s.offsetTop;
    box.style.transform = `translateY(${-Math.max(0, top - 4)}px)`;
  }
  function onInput(e) {
    if (state === 'done') return;
    const inp = e.target;
    if (state === 'ready') { state = 'play'; t0 = performance.now(); iv = setInterval(tick, 200); }
    if (e.isTrusted) keys++;
    if (/\s/.test(inp.value)) { submit(inp.value.replace(/\s+/g, '')); inp.value = ''; return; }
    const w = words[idx], v = norm(inp.value);
    const s = span(idx); if (s) s.classList.toggle('err', !!v && !norm(w).startsWith(v));
  }
  function onKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); if (state === 'play' && e.target.value.trim()) { submit(e.target.value.trim()); e.target.value = ''; } }
    if (e.key === 'Escape') { e.preventDefault(); start(); }
  }
  function submit(v) {
    if (!v || state !== 'play') return;
    const good = norm(v) === norm(words[idx]);
    const s = span(idx);
    if (s) { s.classList.remove('cur', 'err'); s.classList.add(good ? 'ok' : 'ko'); }
    results.push(good);
    if (good) { ok++; sfx.tick(); } else ko++;
    idx++;
    $('#ty-ok', stage).textContent = ok; $('#ty-ko', stage).textContent = ko;
    $('#ty-gain', stage).textContent = fmt(ok * TYPING_LEVELS[lv].per);
    mark();
  }
  function tick() {
    if (!alive || state !== 'play') return;
    const left = Math.max(0, DURATION - (performance.now() - t0) / 1000);
    const el = $('#ty-time', stage); if (el) { el.textContent = Math.ceil(left); el.classList.toggle('neg', left < 10); }
    if (left <= 0) finish();
  }

  function finish() {
    if (state !== 'play') return;
    state = 'done'; clearInterval(iv);
    const inp = $('#ty-in', stage); if (inp) inp.disabled = true;
    const L = TYPING_LEVELS[lv], amount = ok * L.per, acc = ok + ko ? Math.round((ok / (ok + ko)) * 100) : 0;
    const r = guard ? guard.result() : { untrusted: 0, actions: 0, sec: DURATION }; guard && guard.destroy(); guard = null;
    // contrôle : frappes simulées par un script, ou vitesse impossible à la main
    const v = { sec: Math.round(r.sec), actions: r.actions, untrusted: r.untrusted, fastShare: r.fastShare, medianMs: 0 };
    if (r.untrusted >= 8) { v.flag = 'cheat'; v.reason = `${r.untrusted} frappes simulées par un script`; }
    else if (ok > 200 || keys < ok * 2) { v.flag = 'fast'; v.reason = ok > 200 ? `${ok} mots en une minute, c'est plus que le record du monde` : 'mots validés sans les taper'; }
    if (v.flag === 'cheat') { const p = punish(wallet, 'typing', lv, v, Math.max(amount, 100)); stage.innerHTML = refusedHTML(v, p); $('[data-again]', stage).onclick = intro; sfx.lose(); return; }
    if (v.flag === 'fast') { tooFast(wallet, 'typing', lv, v); stage.innerHTML = refusedHTML(v); $('[data-again]', stage).onclick = start; return; }
    const s = wallet.stats, key = 'typingBest' + lv, record = ok > (s[key] || 0);
    if (record) s[key] = ok;
    wallet.freeReward('typing', amount, { Words: ok, Errors: ko, Keys: keys, ['Words' + lv]: ok, ['Rounds' + lv]: 1 },
      { ...(record && ok >= 40 ? { feed: { txt: `a tapé ${ok} mots en une minute à la`, tail: `(${L.name.toLowerCase()})` } } : {}), log: { lv, sec: DURATION, actions: r.actions } });
    stage.innerHTML = (endCardHTML({ win: record && ok > 0, title: `${ok} mots par minute${record && ok ? ' : record !' : ''}`, amount,
      text: `Précision : <b>${acc} %</b> (${ok} justes, ${ko} faute${ko > 1 ? 's' : ''}) · niveau ${L.name.toLowerCase()}${s[key] ? ` · record ${s[key]}` : ''}.`, extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
    $('[data-again]', stage).onclick = start;
    $('[data-modes]', stage).onclick = intro;
    if (amount) { sfx.win(record); coinRain(Math.min(40, 8 + ok / 3)); }
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.closest('input,textarea')) return;
    if ((state === 'intro' || state === 'done') && e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); start(); }
  };
  document.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; clearInterval(iv); guard && guard.destroy(); document.removeEventListener('keydown', onKey); };
}
