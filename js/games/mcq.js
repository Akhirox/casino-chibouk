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
// Réponse écrite : minuscules, sans accents, sans article en tête ni ponctuation
export function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`\-.]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/^(la|le|les|l) /, '').replace(/\s+/g, ' ').trim();
}
export function lev(a, b) {
  if (a === b) return 0;
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return d[b.length];
}
// Bonne réponse si identique à une forme acceptée, ou à 1 faute près (2 pour les noms longs),
// sauf si le texte tapé correspond exactement à une autre réponse connue (`reject`)
export function matches(input, accept, reject = []) {
  const v = normalize(input);
  if (!v) return false;
  const ok = accept.map(normalize);
  if (ok.includes(v)) return true;
  if (reject.some((r) => normalize(r) === v)) return false;
  return ok.some((a) => { const tol = a.length >= 9 ? 2 : a.length >= 5 ? 1 : 0; return tol > 0 && lev(v, a) <= tol; });
}

export function mountMCQ(view, { wallet }, opt) {
  const N = CONFIG.QUIZ_QUESTIONS;
  let alive = true, state = 'intro'; // intro | loading | ask | feedback | done
  let qi = 0, correct = 0, results = [], questions = [], data = null;
  let mode = opt.modes ? opt.modes[0] : {};
  try { const k = localStorage.getItem('chibouk_mode_' + opt.kind); if (opt.modes && opt.modes.some((m) => m.key === k)) mode = opt.modes.find((m) => m.key === k); } catch {}
  const SECS = () => mode.seconds || opt.seconds || CONFIG.QUIZ_SECONDS;
  const PER = () => mode.perCorrect || CONFIG.QUIZ_PER_CORRECT;
  const BONUS = () => mode.perfectBonus || CONFIG.QUIZ_PERFECT_BONUS;
  let deadline = 0, raf = null, nextTimer = null, credited = false;

  view.innerHTML = `
  <div class="qz-wrap mcq ${opt.kind}">
    <div class="game-head"><h1>${opt.title}</h1>
      <div class="actions"><span class="gc-tag">Gratuit · ${opt.modes ? `jusqu'à ${Math.max(...opt.modes.map((m) => m.perCorrect || CONFIG.QUIZ_PER_CORRECT))}` : CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse</span></div></div>
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
    const modes = opt.modes ? `<div class="mcq-modes">${opt.modes.map((m) => `<button type="button" class="mcq-mode ${m.key === mode.key ? 'on' : ''}" data-m="${m.key}">
        <b>${m.label}</b><span>${m.desc}</span><small>${m.seconds || opt.seconds} s · +${m.perCorrect || CONFIG.QUIZ_PER_CORRECT} ${CUR} / bonne rép. · +${m.perfectBonus || CONFIG.QUIZ_PERFECT_BONUS} sans-faute</small></button>`).join('')}</div>` : '';
    body.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>${typeof opt.introTitle === 'function' ? opt.introTitle(mode) : opt.introTitle}</h2>
      <p>${opt.introText}<br>
      <b>+${PER()} ${CUR}</b> par bonne réponse, <b>+${BONUS()} ${CUR}</b> de bonus pour un sans-faute (jusqu'à ${fmt(N * PER() + BONUS())}).</p>
      ${modes}
      <button class="btn btn-gold btn-lg" id="qz-start">Commencer</button></div>`;
    $('#qz-start', view).onclick = start;
    $$('.mcq-mode', view).forEach((b) => (b.onclick = () => {
      mode = opt.modes.find((m) => m.key === b.dataset.m);
      try { localStorage.setItem('chibouk_mode_' + opt.kind, mode.key); } catch {}
      sfx.click(); intro();
    }));
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
    questions = opt.build(data, N, mode.key);
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
      <div class="qz-timer"><div class="qz-bar" id="qz-bar"></div><span id="qz-sec">${SECS()}</span></div>
      ${q.type === 'text' ? `<form class="qz-form mcq-text" id="mcq-form" autocomplete="off">
          <input id="mcq-input" class="bet-input" type="text" maxlength="60" placeholder="${esc(q.placeholder || 'Ta réponse')}" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Ta réponse">
          <button class="btn btn-gold btn-lg" type="submit">Valider</button></form>`
        : `<div class="mcq-choices">${q.choices.map((c, i) => `<button type="button" class="mcq-c" data-i="${i}"><kbd>${'ABCD'[i]}</kbd><span>${esc(c)}</span></button>`).join('')}</div>`}
      <div class="mcq-reveal" id="mcq-reveal"></div>`;
    $$('.mcq-c', view).forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
    const form = $('#mcq-form', view);
    if (form) {
      const inp = $('#mcq-input', view);
      form.onsubmit = (e) => { e.preventDefault(); if (inp.value.trim()) answer(inp.value); };
      setTimeout(() => alive && inp.focus(), 30);
    }
    renderDots();
    deadline = performance.now() + SECS() * 1000;
    cancelAnimationFrame(raf);
    const tick = (now) => {
      if (!alive || state !== 'ask') return;
      const left = Math.max(0, deadline - now);
      const bar = $('#qz-bar', view), sec = $('#qz-sec', view);
      if (bar) { bar.style.width = (left / (SECS() * 1000)) * 100 + '%'; bar.classList.toggle('hurry', left < 3000); }
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
    const text = q.type === 'text';
    const ok = !timeout && (text ? matches(i, q.accept, q.reject) : i === q.answer);
    const right = text ? q.accept[0] : q.choices[q.answer];
    results.push(ok);
    if (ok) correct++;
    $('.qz-q', view).classList.add(ok ? 'good' : 'bad');
    if (text) { const inp = $('#mcq-input', view); inp.disabled = true; inp.classList.add(ok ? 'ok' : 'ko'); if (!ok && !timeout) inp.value = i; $$('#mcq-form button', view).forEach((b) => (b.disabled = true)); }
    $$('.mcq-c', view).forEach((b) => {
      const k = +b.dataset.i;
      b.disabled = true;
      if (k === q.answer) b.classList.add('right');
      else if (k === i) b.classList.add('wrong');
    });
    $('#qz-verdict', view).textContent = ok ? `Bravo ! +${PER()}${text && normalize(i) !== normalize(right) ? ` (c'était ${right})` : ''}` : timeout ? `Temps écoulé… c'était ${right}` : `Raté, c'était ${right}`;
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
    const amount = correct * PER() + (perfect ? BONUS() : 0);
    const extra = { Correct: correct, Perfect: perfect ? 1 : 0 };
    if (mode.stat) { extra[mode.stat + 'Correct'] = correct; extra[mode.stat + 'Perfect'] = perfect ? 1 : 0; }
    wallet.freeReward(opt.kind, amount, extra);
    return amount;
  }

  function finish() {
    state = 'done';
    const amount = reward();
    const perfect = correct === N;
    renderDots();
    body.innerHTML = `<div class="qz-card">${monkeySVG(perfect ? { crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' } : { wink: correct >= N / 2 })}
      <h2>${correct}/${N} bonnes réponses${perfect ? ' : sans-faute !' : ''}</h2>
      <p>${amount > 0 ? `+${money(amount)} ajoutés à ton solde${perfect ? ` (dont ${BONUS()} de bonus)` : ''}.` : 'Pas de Brundles cette fois, retente ta chance !'}</p>
      <div class="qz-end-btns"><button class="btn btn-gold btn-lg" id="qz-again">Rejouer${opt.modes ? ` (${mode.label})` : ''}</button>${opt.modes ? '<button class="btn btn-ghost" id="qz-modes">Changer de mode</button>' : ''}</div></div>`;
    $('#qz-again', view).onclick = start;
    if (opt.modes) $('#qz-modes', view).onclick = intro;
    if (amount > 0) { sfx.win(perfect); coinRain(perfect ? 40 : 15); }
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.matches('input, textarea')) return;
    if (state === 'intro' || state === 'done') { if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); start(); } return; }
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
      const extra = { Correct: correct };
      if (mode.stat) extra[mode.stat + 'Correct'] = correct;
      wallet.freeReward(opt.kind, correct * PER(), extra);
    }
  };
}
