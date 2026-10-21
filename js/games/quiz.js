// Calcul mental — jeu gratuit : 10 problèmes, 10 secondes chacun, des Brundles par bonne réponse
import { CONFIG } from '../config.js';
import { gotHTML, withFreeBonus } from '../rewards.js';
import { randInt } from './slots-math.js';
import { icon, monkeySVG } from '../art.js';
import { $, $$, fmt, money, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';
import { submitRecord, recordEndHTML, fmtCs } from '../records.js';
import { createGuard, judgeReactions, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';

const r = (a, b) => a + randInt(b - a + 1);

// Problème selon la difficulté (0 = facile, 1 = moyen, 2 = un peu plus dur)
// Modes : facile / moyen / difficile (temps, gains et calculs différents)
export const QUIZ_MODES = {
  easy: { label: 'Facile', desc: 'Additions, soustractions et tables de 2 à 9.', seconds: 10, per: 10, bonus: 50, stat: 'Easy' },
  medium: { label: 'Moyen', desc: 'De plus en plus dur : divisions et calculs à deux opérations à la fin.', seconds: 12, per: 15, bonus: 75, stat: 'Medium' },
  hard: { label: 'Difficile', desc: 'Multiplications à deux chiffres, carrés, pourcentages, grandes soustractions.', seconds: 15, per: 25, bonus: 125, stat: 'Hard' },
};

export function makeHard() {
  const k = ['mul2', 'mul21', 'sq', 'div3', 'mix3', 'sub3', 'pct'][randInt(7)];
  let a, b, c, d;
  switch (k) {
    case 'mul2': a = r(12, 19); b = r(11, 19); return { q: `${a} × ${b}`, ans: a * b };
    case 'mul21': a = r(21, 99); b = r(3, 9); return { q: `${a} × ${b}`, ans: a * b };
    case 'sq': a = r(11, 25); return { q: `${a}²`, ans: a * a };
    case 'div3': b = r(3, 9); c = r(12, 60); return { q: `${b * c} ÷ ${b}`, ans: c };
    case 'mix3': a = r(3, 12); b = r(3, 12); c = r(3, 12); d = r(2, 9); return { q: `${a} × ${b} + ${c} × ${d}`, ans: a * b + c * d };
    case 'sub3': a = r(150, 999); b = r(37, 149); return { q: `${a} − ${b}`, ans: a - b };
    case 'pct': { const p = [10, 20, 25, 50, 75][randInt(5)]; const n = r(2, 20) * (p === 75 || p === 25 ? 20 : 10); return { q: `${p} % de ${n}`, ans: (p * n) / 100 }; }
  }
  return { q: '12 × 12', ans: 144 };
}

export function makeProblem(level) {
  const kinds = level === 0 ? ['add', 'sub', 'mul'] : level === 1 ? ['add', 'sub', 'mul', 'div'] : ['mul', 'div', 'mix', 'add2'];
  const k = kinds[randInt(kinds.length)];
  let a, b, c;
  switch (k) {
    case 'add': a = r(4, level ? 60 : 30); b = r(3, level ? 45 : 25); return { q: `${a} + ${b}`, ans: a + b };
    case 'add2': a = r(25, 95); b = r(15, 85); return { q: `${a} + ${b}`, ans: a + b };
    case 'sub': a = r(level ? 30 : 12, level ? 99 : 40); b = r(2, a - 1); return { q: `${a} − ${b}`, ans: a - b };
    case 'mul': a = r(2, level ? 12 : 9); b = r(2, level ? 12 : 9); return { q: `${a} × ${b}`, ans: a * b };
    case 'div': b = r(2, 10); c = r(2, 10); return { q: `${b * c} ÷ ${b}`, ans: c };
    case 'mix': a = r(2, 9); b = r(2, 9); c = r(2, 20); return { q: `${a} × ${b} + ${c}`, ans: a * b + c };
  }
  return { q: '1 + 1', ans: 2 };
}

export function mount(view, { wallet }) {
  const N = CONFIG.QUIZ_QUESTIONS;
  let modeKey = 'medium';
  try { const m = localStorage.getItem('chibouk_quiz_mode'); if (QUIZ_MODES[m]) modeKey = m; } catch {}
  const M = () => QUIZ_MODES[modeKey];
  let SECS = M().seconds;
  let alive = true;
  let state = 'intro'; // intro | ask | feedback | done
  let qi = 0, correct = 0, results = [], current = null;
  let deadline = 0, raf = null, nextTimer = null, credited = false;

  view.innerHTML = `
  <div class="qz-wrap">
    <div class="game-head"><h1>Calcul <span>mental</span></h1>
      <div class="actions"><span class="gc-tag">Gratuit · jusqu'à ${QUIZ_MODES.hard.per} ${CUR} par bonne réponse</span></div></div>
    <div class="qz-stage">
      <div class="qz-dots" id="qz-dots">${Array.from({ length: N }, () => '<i></i>').join('')}</div>
      <div class="qz-body" id="qz-body"></div>
    </div>
  </div>`;
  const body = $('#qz-body', view);

  function renderDots() {
    $$('#qz-dots i', view).forEach((d, i) => {
      d.className = i < results.length ? (results[i] ? 'ok' : 'ko') : i === qi && state !== 'intro' && state !== 'done' ? 'cur' : '';
    });
  }

  function intro() {
    state = 'intro';
    SECS = M().seconds;
    body.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>${N} calculs, ${SECS} secondes chacun</h2>
      <p>${M().desc}<br>
      <b>${withFreeBonus(`+${M().per}`, 'quiz')} ${CUR}</b> par bonne réponse, <b>${withFreeBonus(`+${M().bonus}`, 'quiz')} ${CUR}</b> de bonus pour un sans-faute (jusqu'à ${fmt(N * M().per + M().bonus)}).</p>
      <div class="mcq-modes three">${Object.entries(QUIZ_MODES).map(([k, m]) => `<button type="button" class="mcq-mode ${k === modeKey ? 'on' : ''}" data-m="${k}"><b>${m.label}</b><span>${m.desc}</span><small>${withFreeBonus(`${m.seconds} s · +${m.per} ${CUR} / bonne rép. · +${m.bonus} sans-faute`, 'quiz')}</small></button>`).join('')}</div>
      ${lockBannerHTML(wallet, 'quiz')}
      <button class="btn btn-gold btn-lg" id="qz-start" ${lockedUntil(wallet, 'quiz') ? 'disabled' : ''}>Commencer</button></div>`;
    $('#qz-start', view).onclick = start;
    $$('.mcq-mode', view).forEach((b) => (b.onclick = () => { modeKey = b.dataset.m; try { localStorage.setItem('chibouk_quiz_mode', modeKey); } catch {} sfx.click(); intro(); }));
    renderDots();
  }

  let guard = null, rts = [], shownAt = 0, spent = 0, recRes = null; // spent : chrono de la partie (records)
  function start() {
    if (lockedUntil(wallet, 'quiz')) { intro(); return; }
    qi = 0; correct = 0; results = []; credited = false; spent = 0; recRes = null;
    guard && guard.destroy(); guard = createGuard(view); rts = [];
    sfx.click();
    ask();
  }

  function ask() {
    state = 'ask';
    current = modeKey === 'easy' ? makeProblem(qi < 6 || randInt(3) > 0 ? 0 : 1) : modeKey === 'hard' ? (qi < 2 ? makeProblem(2) : makeHard()) : makeProblem(qi < 4 ? 0 : qi < 8 ? 1 : 2);
    body.innerHTML = `
      <div class="qz-q"><span class="qz-num">Question ${qi + 1}/${N} <span class="qz-chrono" title="Chrono de la partie (sert à départager les records)">${icon('hourglass')}<b id="qz-chrono">${fmtCs(spent)}</b></span></span><div class="qz-expr">${current.q} = <span class="qz-ans" id="qz-ans">?</span></div></div>
      <div class="qz-timer"><div class="qz-bar" id="qz-bar"></div><span id="qz-sec">${SECS}</span></div>
      <form class="qz-form" id="qz-form" autocomplete="off">
        <input id="qz-input" class="bet-input qz-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" aria-label="Ta réponse" autofocus>
        <button class="btn btn-gold btn-lg" type="submit">Valider</button>
      </form>
      <div class="qz-pad">${['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ok'].map((k) => `<button type="button" data-k="${k}" class="${k === 'ok' ? 'ok' : ''}">${k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k}</button>`).join('')}</div>`;
    const input = $('#qz-input', view);
    const show = () => { $('#qz-ans', view).textContent = input.value || '?'; };
    input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9]/g, ''); show(); });
    $('#qz-form', view).onsubmit = (e) => { e.preventDefault(); answer(input.value); };
    $$('.qz-pad button', view).forEach((b) => (b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'ok') return answer(input.value);
      if (k === 'del') input.value = input.value.slice(0, -1);
      else if (input.value.length < 5) input.value += k;
      show(); sfx.tick();
    }));
    if (window.matchMedia('(hover: hover)').matches) input.focus();
    renderDots();
    shownAt = performance.now();
    deadline = performance.now() + SECS * 1000;
    cancelAnimationFrame(raf);
    const tick = (now) => {
      if (!alive || state !== 'ask') return;
      const left = Math.max(0, deadline - now);
      const bar = $('#qz-bar', view), sec = $('#qz-sec', view);
      if (bar) { bar.style.width = (left / (SECS * 1000)) * 100 + '%'; bar.classList.toggle('hurry', left < 3000); }
      if (sec) sec.textContent = Math.ceil(left / 1000);
      const ch = $('#qz-chrono', view); if (ch) ch.textContent = fmtCs(spent + Math.min(SECS * 1000, now - shownAt));
      if (left <= 0) { answer(null); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function answer(val) {
    if (state !== 'ask') return;
    state = 'feedback';
    cancelAnimationFrame(raf);
    const timeout = val === null;
    const ok = !timeout && val !== '' && +val === current.ans;
    if (!timeout) rts.push(performance.now() - shownAt);
    spent += timeout ? SECS * 1000 : Math.min(SECS * 1000, performance.now() - shownAt);
    { const ch = $('#qz-chrono', view); if (ch) ch.textContent = fmtCs(spent); }
    results.push(ok);
    if (ok) correct++;
    const q = $('.qz-q', view);
    q.classList.add(ok ? 'good' : 'bad');
    $('#qz-ans', view).textContent = current.ans;
    q.insertAdjacentHTML('beforeend', `<div class="qz-verdict">${ok ? `Bravo ! +${M().per}` : timeout ? 'Temps écoulé…' : `Raté, c'était ${current.ans}`}</div>`);
    $$('.qz-form input, .qz-form button, .qz-pad button', view).forEach((el) => (el.disabled = true));
    if (ok) sfx.coin(); else sfx.lose();
    renderDots();
    nextTimer = setTimeout(() => {
      if (!alive) return;
      qi++;
      if (qi >= N) finish(); else ask();
    }, ok ? 700 : 1300);
  }

  function reward() {
    if (credited) return { amount: 0 };
    credited = true;
    const perfect = correct === N;
    const amount = correct * M().per + (perfect ? M().bonus : 0);
    const res = settle(amount, { Correct: correct, Perfect: perfect ? 1 : 0, [M().stat + 'Correct']: correct, [M().stat + 'Perfect']: perfect ? 1 : 0 });
    // record : niveau, puis bonnes réponses, puis chrono au centième
    if (!res.refused && correct > 0) recRes = submitRecord(wallet, 'quiz', { l: Object.keys(QUIZ_MODES).indexOf(modeKey), v: correct, t: spent });
    return res;
  }
  // contrôle fair-play (temps de réponse) avant la récompense
  function settle(amount, extra, partial = false) {
    const v = judgeReactions(guard, rts, { lenient: true, accuracy: rts.length ? correct / rts.length : null }); guard = null; // réponses tapées : contrôle souple
    if (v.flag === 'cheat') return { refused: v, p: punish(wallet, 'quiz', modeKey, v, Math.max(amount, M().per * 5)) };
    if (v.flag === 'fast') { tooFast(wallet, 'quiz', modeKey, v); return { refused: v }; }
    wallet.freeReward('quiz', amount, extra, { log: { lv: modeKey, sec: v.sec, actions: v.actions, ms: v.medianMs, partial } });
    return { amount };
  }

  function finish() {
    state = 'done';
    const res = reward();
    renderDots();
    if (res.refused) {
      body.innerHTML = refusedHTML(res.refused, res.p);
      $('[data-again]', body).onclick = res.refused.flag === 'cheat' ? intro : start;
      return;
    }
    const amount = res.amount, perfect = correct === N;
    body.innerHTML = `<div class="qz-card">${monkeySVG(perfect ? { crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' } : { wink: correct >= N / 2 })}
      <h2>${correct}/${N} bonnes réponses${perfect ? ' : sans-faute !' : ''}</h2>
      <p>${amount > 0 ? `${gotHTML(amount)} ajoutés à ton solde${perfect ? ` (dont ${M().bonus} de bonus)` : ''}.` : 'Pas de Brundles cette fois, retente ta chance !'}</p>
      <p class="qz-time">Chrono : <b>${fmtCs(spent)}</b>${recRes ? `<br>${recordEndHTML('quiz', recRes, wallet)}` : ''}</p>
      <div class="qz-end-btns"><button class="btn btn-gold btn-lg" id="qz-again">Rejouer (${M().label})</button><button class="btn btn-ghost" id="qz-modes">Changer de mode</button></div></div>`;
    $('#qz-again', view).onclick = start;
    $('#qz-modes', view).onclick = intro;
    if (amount > 0) { sfx.win(perfect); coinRain(perfect ? 40 : 15); }
  }

  const onKey = (e) => {
    if (state === 'intro' || state === 'done') { if (e.key === 'Enter' && !document.querySelector('.modal-backdrop') && !e.target.closest('button')) { e.preventDefault(); start(); } return; }
    if (state !== 'ask' || e.target.id === 'qz-input') return;
    const input = $('#qz-input', view);
    if (/^[0-9]$/.test(e.key) && input.value.length < 5) { input.value += e.key; $('#qz-ans', view).textContent = input.value; }
    else if (e.key === 'Backspace') { input.value = input.value.slice(0, -1); $('#qz-ans', view).textContent = input.value || '?'; }
    else if (e.key === 'Enter') answer(input.value);
  };
  document.addEventListener('keydown', onKey);

  intro();
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(nextTimer);
    document.removeEventListener('keydown', onKey);
    // partie interrompue : on crédite les bonnes réponses déjà données (sans le bonus), à partir de 3 questions répondues
    if ((state === 'ask' || state === 'feedback') && correct > 0 && !credited && results.length >= 3) {
      credited = true;
      settle(correct * M().per, { Correct: correct, [M().stat + 'Correct']: correct }, true);
    } else if (guard) guard.destroy();
  };
}
