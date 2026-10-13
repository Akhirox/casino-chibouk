// Calcul mental — jeu gratuit : 10 problèmes, 10 secondes chacun, des Brundles par bonne réponse
import { CONFIG } from '../config.js';
import { randInt } from './slots-math.js';
import { icon, monkeySVG } from '../art.js';
import { $, $$, fmt, money, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const r = (a, b) => a + randInt(b - a + 1);

// Problème selon la difficulté (0 = facile, 1 = moyen, 2 = un peu plus dur)
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
  const N = CONFIG.QUIZ_QUESTIONS, SECS = CONFIG.QUIZ_SECONDS;
  let alive = true;
  let state = 'intro'; // intro | ask | feedback | done
  let qi = 0, correct = 0, results = [], current = null;
  let deadline = 0, raf = null, nextTimer = null, credited = false;

  view.innerHTML = `
  <div class="qz-wrap">
    <div class="game-head"><h1>Calcul <span>mental</span></h1>
      <div class="actions"><span class="gc-tag">Gratuit · ${CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse</span></div></div>
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
    body.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>${N} calculs, ${SECS} secondes chacun</h2>
      <p>Additions, soustractions, tables de multiplication et divisions.<br>
      <b>+${CONFIG.QUIZ_PER_CORRECT} ${CUR}</b> par bonne réponse, <b>+${CONFIG.QUIZ_PERFECT_BONUS} ${CUR}</b> de bonus pour un sans-faute (jusqu'à ${fmt(N * CONFIG.QUIZ_PER_CORRECT + CONFIG.QUIZ_PERFECT_BONUS)}).</p>
      <button class="btn btn-gold btn-lg" id="qz-start">Commencer</button></div>`;
    $('#qz-start', view).onclick = start;
    renderDots();
  }

  function start() {
    qi = 0; correct = 0; results = []; credited = false;
    sfx.click();
    ask();
  }

  function ask() {
    state = 'ask';
    current = makeProblem(qi < 4 ? 0 : qi < 8 ? 1 : 2);
    body.innerHTML = `
      <div class="qz-q"><span class="qz-num">Question ${qi + 1}/${N}</span><div class="qz-expr">${current.q} = <span class="qz-ans" id="qz-ans">?</span></div></div>
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
    deadline = performance.now() + SECS * 1000;
    cancelAnimationFrame(raf);
    const tick = (now) => {
      if (!alive || state !== 'ask') return;
      const left = Math.max(0, deadline - now);
      const bar = $('#qz-bar', view), sec = $('#qz-sec', view);
      if (bar) { bar.style.width = (left / (SECS * 1000)) * 100 + '%'; bar.classList.toggle('hurry', left < 3000); }
      if (sec) sec.textContent = Math.ceil(left / 1000);
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
    results.push(ok);
    if (ok) correct++;
    const q = $('.qz-q', view);
    q.classList.add(ok ? 'good' : 'bad');
    $('#qz-ans', view).textContent = current.ans;
    q.insertAdjacentHTML('beforeend', `<div class="qz-verdict">${ok ? `Bravo ! +${CONFIG.QUIZ_PER_CORRECT}` : timeout ? 'Temps écoulé…' : `Raté, c'était ${current.ans}`}</div>`);
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
    if (credited) return 0;
    credited = true;
    const perfect = correct === N;
    const amount = correct * CONFIG.QUIZ_PER_CORRECT + (perfect ? CONFIG.QUIZ_PERFECT_BONUS : 0);
    wallet.freeReward('quiz', amount, { Correct: correct, Perfect: perfect ? 1 : 0 });
    return amount;
  }

  function finish() {
    state = 'done';
    const amount = reward();
    const perfect = correct === N;
    renderDots();
    body.innerHTML = `<div class="qz-card">${monkeySVG(perfect ? { crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' } : { wink: correct >= N / 2 })}
      <h2>${correct}/${N} bonnes réponses${perfect ? ' : sans-faute !' : ''}</h2>
      <p>${amount > 0 ? `+${money(amount)} ajoutés à ton solde${perfect ? ` (dont ${CONFIG.QUIZ_PERFECT_BONUS} de bonus)` : ''}.` : 'Pas de Brundles cette fois, retente ta chance !'}</p>
      <button class="btn btn-gold btn-lg" id="qz-again">Rejouer</button></div>`;
    $('#qz-again', view).onclick = start;
    if (amount > 0) { sfx.win(perfect); coinRain(perfect ? 40 : 15); }
  }

  const onKey = (e) => {
    if (state === 'intro' || state === 'done') { if (e.key === 'Enter' && !document.querySelector('.modal-backdrop')) { e.preventDefault(); start(); } return; }
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
    // partie interrompue : on crédite les bonnes réponses déjà données (sans le bonus)
    if ((state === 'ask' || state === 'feedback') && correct > 0 && !credited) {
      credited = true;
      wallet.freeReward('quiz', correct * CONFIG.QUIZ_PER_CORRECT, { Correct: correct });
    }
  };
}
