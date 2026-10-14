// Moteur de quiz à choix multiples (capitales, cinéma) : 10 questions chronométrées, 4 réponses,
// des Brundles par bonne réponse et un bonus pour un sans-faute. Même barème que le calcul mental.
import { CONFIG } from '../config.js';
import { randInt } from './slots-math.js';
import { monkeySVG } from '../art.js';
import { $, $$, fmt, money, coinRain, toast, esc, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

export const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const pick = (arr) => arr[randInt(arr.length)];

// Ajoute jusqu'à n éléments distincts de `pool` (dans un ordre aléatoire) qui passent `ok`
export function pickDistinct(pool, n, ok = () => true, taken = new Set()) {
  const out = [];
  for (const x of shuffle(pool)) {
    if (out.length >= n) break;
    if (taken.has(x) || !ok(x)) continue;
    taken.add(x); out.push(x);
  }
  return out;
}

// Construit une question : la bonne réponse est mélangée parmi les leurres
export function makeQ({ label, big, sub = '', right, wrong, reveal = '' }) {
  const choices = shuffle([right, ...wrong.slice(0, 3)]);
  return { label, big, sub, choices, answer: choices.indexOf(right), reveal };
}

/**
 * opt = { kind, title, tag, introTitle, introText, seconds, load: async () => data, build: (data, n) => questions }
 */
export function mountMCQ(view, { wallet }, opt) {
  const N = CONFIG.QUIZ_QUESTIONS, SECS = opt.seconds || CONFIG.QUIZ_SECONDS;
  let alive = true, state = 'intro'; // intro | loading | ask | feedback | done
  let qi = 0, correct = 0, results = [], questions = [], data = null;
  let deadline = 0, raf = null, nextTimer = null, credited = false;

  view.innerHTML = `
  <div class="qz-wrap mcq ${opt.kind}">
    <div class="game-head"><h1>${opt.title}</h1>
      <div class="actions"><span class="gc-tag">Gratuit · ${CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse</span></div></div>
    <div class="qz-stage">
      <div class="qz-dots" id="qz-dots">${Array.from({ length: N }, () => '<i></i>').join('')}</div>
      <div class="qz-body" id="qz-body"></div>
    </div>
  </div>`;
  const body = $('#qz-body', view);

  function renderDots() {
    $$('#qz-dots i', view).forEach((d, i) => {
      d.className = i < results.length ? (results[i] ? 'ok' : 'ko') : i === qi && (state === 'ask' || state === 'feedback') ? 'cur' : '';
    });
  }

  function intro() {
    state = 'intro';
    body.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>${opt.introTitle}</h2>
      <p>${opt.introText}<br>
      <b>+${CONFIG.QUIZ_PER_CORRECT} ${CUR}</b> par bonne réponse, <b>+${CONFIG.QUIZ_PERFECT_BONUS} ${CUR}</b> de bonus pour un sans-faute (jusqu'à ${fmt(N * CONFIG.QUIZ_PER_CORRECT + CONFIG.QUIZ_PERFECT_BONUS)}).</p>
      <button class="btn btn-gold btn-lg" id="qz-start">Commencer</button></div>`;
    $('#qz-start', view).onclick = start;
    renderDots();
  }

  async function start() {
    if (state === 'loading') return;
    sfx.click();
    if (!data) {
      state = 'loading';
      body.innerHTML = `<div class="qz-card">${monkeySVG({ cls: 'bounce' })}<p>Chargement des questions…</p></div>`;
      try { data = await opt.load(); } catch (e) {
        console.error(e);
        if (!alive) return;
        toast('Impossible de charger les questions, réessaie dans un instant.', 'error');
        intro(); return;
      }
      if (!alive) return;
    }
    questions = opt.build(data, N);
    qi = 0; correct = 0; results = []; credited = false;
    ask();
  }

  function ask() {
    state = 'ask';
    const q = questions[qi];
    body.innerHTML = `
      <div class="qz-q mcq-q"><span class="qz-num">Question ${qi + 1}/${N}</span>
        <div class="mcq-label">${esc(q.label)}</div>
        <div class="mcq-big">${esc(q.big)}</div>${q.sub ? `<div class="mcq-sub">${esc(q.sub)}</div>` : ''}
        <div class="qz-verdict" id="qz-verdict"></div></div>
      <div class="qz-timer"><div class="qz-bar" id="qz-bar"></div><span id="qz-sec">${SECS}</span></div>
      <div class="mcq-choices">${q.choices.map((c, i) => `<button type="button" class="mcq-c" data-i="${i}"><kbd>${'ABCD'[i]}</kbd><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="mcq-reveal" id="mcq-reveal"></div>`;
    $$('.mcq-c', view).forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
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

  function next() {
    if (!alive || state !== 'feedback') return;
    clearTimeout(nextTimer);
    qi++;
    if (qi >= N) finish(); else ask();
  }

  function answer(i) {
    if (state !== 'ask') return;
    state = 'feedback';
    cancelAnimationFrame(raf);
    const q = questions[qi];
    const timeout = i === null;
    const ok = !timeout && i === q.answer;
    results.push(ok);
    if (ok) correct++;
    $('.qz-q', view).classList.add(ok ? 'good' : 'bad');
    $$('.mcq-c', view).forEach((b) => {
      const k = +b.dataset.i;
      b.disabled = true;
      if (k === q.answer) b.classList.add('right');
      else if (k === i) b.classList.add('wrong');
    });
    $('#qz-verdict', view).textContent = ok ? `Bravo ! +${CONFIG.QUIZ_PER_CORRECT}` : timeout ? `Temps écoulé… c'était ${q.choices[q.answer]}` : `Raté, c'était ${q.choices[q.answer]}`;
    const rv = $('#mcq-reveal', view);
    rv.innerHTML = `${q.reveal || ''}<button class="btn btn-ghost btn-sm" id="mcq-next">${qi + 1 >= N ? 'Résultat' : 'Question suivante'} <kbd>Entrée</kbd></button>`;
    $$('img', rv).forEach((img) => (img.onerror = () => img.remove()));
    $('#mcq-next', view).onclick = next;
    if (ok) sfx.coin(); else sfx.lose();
    renderDots();
    nextTimer = setTimeout(next, (ok ? 1100 : 2000) + (q.reveal ? 1400 : 0));
  }

  function reward() {
    if (credited) return 0;
    credited = true;
    const perfect = correct === N;
    const amount = correct * CONFIG.QUIZ_PER_CORRECT + (perfect ? CONFIG.QUIZ_PERFECT_BONUS : 0);
    wallet.freeReward(opt.kind, amount, { Correct: correct, Perfect: perfect ? 1 : 0 });
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
    if (document.querySelector('.modal-backdrop') || e.target.matches('input, textarea')) return;
    if (state === 'intro' || state === 'done') { if (e.key === 'Enter') { e.preventDefault(); start(); } return; }
    if (state === 'feedback' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); return; }
    if (state !== 'ask') return;
    const k = e.key.toLowerCase();
    const i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? +k - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
    if (i >= 0 && i < questions[qi].choices.length) { e.preventDefault(); answer(i); }
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
      wallet.freeReward(opt.kind, correct * CONFIG.QUIZ_PER_CORRECT, { Correct: correct });
    }
  };
}
