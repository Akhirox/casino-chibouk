// Petits utilitaires d'interface
import { coinSVG, icon } from './art.js';
import { CONFIG } from './config.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const nf = new Intl.NumberFormat('fr-FR');
export const fmt = (n) => nf.format(Math.round(n || 0));
export const money = (n) => `<span class="money">${fmt(n)}${coinSVG('coin coin-inline')}</span>`;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, type = 'info', ms = 3200) {
  let box = $('#toasts');
  if (!box) { box = h('<div id="toasts" aria-live="polite"></div>'); document.body.append(box); }
  const t = h(`<div class="toast toast-${type}">${msg}</div>`);
  box.append(t);
  // pas plus de 4 notifications à l'écran (3 sur mobile) : les plus anciennes partent
  const max = window.innerWidth <= 760 ? 3 : 4;
  const live = [...box.children].filter((x) => !x.classList.contains('gone'));
  live.slice(0, Math.max(0, live.length - max)).forEach((x) => { x.classList.add('gone'); x.classList.remove('show'); setTimeout(() => x.remove(), 400); });
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
}

export function modal({ title = '', html = '', buttons = [{ label: 'OK', value: true, primary: true }], dismissable = true, cls = '', onOpen = null }) {
  return new Promise((resolve) => {
    const m = h(`<div class="modal-backdrop"><div class="modal ${cls}" role="dialog" aria-modal="true">
      ${title ? `<h2 class="modal-title">${title}</h2>` : ''}
      <div class="modal-body">${html}</div>
      <div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'btn-gold' : 'btn-ghost'}" data-i="${i}">${b.label}</button>`).join('')}</div>
    </div></div>`);
    const close = (v) => { m.classList.remove('show'); setTimeout(() => m.remove(), 250); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(null); };
    m.addEventListener('click', (e) => {
      const b = e.target.closest('.modal-actions [data-i]');
      if (b) close(buttons[+b.dataset.i].value);
      else if (e.target === m && dismissable) close(null);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(m);
    if (onOpen) try { onOpen(m); } catch (err) { console.error(err); }
    requestAnimationFrame(() => m.classList.add('show'));
  });
}

export function countUp(el, to, { from = 0, ms = 900, format = fmt, onTick } = {}) {
  const start = performance.now();
  return new Promise((res) => {
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      el.innerHTML = format(from + (to - from) * e);
      if (onTick) onTick(t);
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

// Pluie de pièces pour les gros gains
// Effet de victoire (boutique) : pièces, bananes, confettis, étoiles ou diamants
let winFx = 'coins';
export function setWinFx(k) { winFx = k || 'coins'; }
const FX_SVG = {
  banana: '<svg viewBox="0 0 100 100"><path d="M22 22 C18 62 50 92 88 74 C92 72 90 66 85 67 C56 76 34 56 34 22 Z" fill="#ffd93b" stroke="#b38300" stroke-width="4"/><path d="M20 24 L18 12 L32 12 L34 24 Z" fill="#6b4a1a"/></svg>',
  stars: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="#ffe066" stroke="#c98a00" stroke-width="1"/></svg>',
  diamond: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#8ee8ff" stroke="#2a8db5" stroke-width="1.2"/><path d="M2 9h20M8 3l-2 6 6 12 6-12-2-6" fill="none" stroke="#2a8db5" stroke-width=".9"/></svg>',
};
const CONFETTI = ['#ff4d5e', '#3ddc84', '#2fb1ff', '#f5c542', '#c77dff', '#ff8a3d'];
export function coinRain(count = 30) {
  const layer = h('<div class="coin-rain" aria-hidden="true"></div>');
  document.body.append(layer);
  for (let i = 0; i < count; i++) {
    let inner;
    if (winFx === 'confetti') inner = `<i class="confetto" style="background:${CONFETTI[i % CONFETTI.length]}"></i>`;
    else if (FX_SVG[winFx]) inner = FX_SVG[winFx];
    else inner = coinSVG('coin');
    const c = h(`<div class="rain-coin fx-${winFx}">${inner}</div>`);
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDelay = Math.random() * 0.8 + 's';
    c.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
    c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    c.style.setProperty('--size', 18 + Math.random() * 22 + 'px');
    layer.append(c);
  }
  setTimeout(() => layer.remove(), 3500);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const CUR = CONFIG.CURRENCY;

// Champ de mise libre (aucune limite) avec ½, ×2 et MAX — utilisé par le Plinko et le Crash
export function betFieldHTML(id, label = 'Mise') {
  return `<div class="bet-field"><label for="${id}">${label}</label>
    <div class="bet-field-row"><input id="${id}" class="bet-input" type="number" min="1" step="1" inputmode="numeric">
    <button type="button" class="btn btn-ghost btn-sm" data-b="half">½</button><button type="button" class="btn btn-ghost btn-sm" data-b="double">×2</button><button type="button" class="btn btn-ghost btn-sm max-btn" data-b="max">MAX</button></div></div>`;
}
export function bindBetField(root, id, storageKey, wallet, def = 10) {
  const input = root.querySelector('#' + id);
  const box = input.closest('.bet-field');
  let v = def;
  try { const s = Math.floor(+localStorage.getItem(storageKey)); if (s >= 1) v = s; } catch {}
  const set = (n) => { v = Math.max(1, Math.floor(n) || 1); input.value = v; try { localStorage.setItem(storageKey, v); } catch {} };
  set(v);
  input.addEventListener('change', () => set(+input.value));
  input.addEventListener('input', () => { const n = Math.floor(+input.value); if (n >= 1) v = n; });
  box.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => {
    if (b.dataset.b === 'half') set(v / 2);
    else if (b.dataset.b === 'double') set(v * 2);
    else set(Math.max(1, wallet.balance));
  }));
  return {
    get value() { return v; },
    // utilisé par l'auto (mise qui augmente ou baisse après une perte) : on prévient le jeu pour qu'il mette à jour ses affichages
    set value(n) { set(n); input.dispatchEvent(new Event('input', { bubbles: true })); },
    set disabled(d) { input.disabled = d; box.querySelectorAll('button').forEach((b) => (b.disabled = d)); },
  };
}

/* ---------------- Mode turbo (par jeu, gardé sur l'appareil) ----------------
   Animations raccourcies et paris auto enchaînés presque sans pause. Les maths ne changent pas. */
const TURBO = {};
export function isTurbo(game) {
  if (!(game in TURBO)) { try { TURBO[game] = localStorage.getItem('chibouk_turbo_' + game) === '1'; } catch { TURBO[game] = false; } }
  return TURBO[game];
}
export function setTurbo(game, on) { TURBO[game] = !!on; try { localStorage.setItem('chibouk_turbo_' + game, on ? '1' : '0'); } catch {} }
// interrupteur Turbo à placer dans un panneau de jeu
export function turboSwitchHTML(game, title = 'Animations accélérées, paris enchaînés sans attendre') {
  return `<label class="turbo-sw" title="${title}"><input type="checkbox" data-turbo="${game}" ${isTurbo(game) ? 'checked' : ''}><i></i>${icon('bolt')}Turbo</label>`;
}
export function bindTurbo(root, game, onChange) {
  root.querySelectorAll(`[data-turbo="${game}"]`).forEach((c) => (c.onchange = () => { setTurbo(game, c.checked); onChange && onChange(c.checked); }));
}

/* ---------------- Paris automatiques (commun à tous les jeux) ----------------
   Nombre de paris libre (vide = infini), arrêt optionnel sur gain, perte ou solde minimum,
   et mise qui augmente / baisse d'un pourcentage après chaque perte (retour à la mise de départ après une victoire). */
export function autoHTML(id, title = 'Paris automatiques', extra = '') {
  return `<div class="auto-box2" id="${id}">
    <div class="ab-title">${title}</div>
    ${extra}
    <div class="ab-grid">
      <label>Nombre<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="∞" data-a="count"></label>
      <label>Stop gain ≥<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="—" data-a="win"></label>
      <label>Stop perte ≥<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="—" data-a="loss"></label>
    </div>
    <div class="ab-grid ab-grid2">
      <label title="Arrête l'auto dès que ton solde passe sous ce montant">Solde min.<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="—" data-a="floor"></label>
      <label class="ab-onloss">En cas de perte<span class="ab-ol"><select class="bet-input" data-a="lmode"><option value="">mise fixe</option><option value="up">augmenter de</option><option value="down">réduire de</option></select><input class="bet-input" type="number" min="1" max="1000" step="1" inputmode="numeric" placeholder="%" data-a="lpct"></span></label>
    </div>
    <p class="ab-olnote" data-a="olnote" hidden>Après une victoire, la mise revient à sa valeur de départ.</p>
    <button type="button" class="btn btn-blue wide ab-go" data-a="go">Lancer l'auto</button>
    <div class="ab-status" data-a="status"></div>
  </div>`;
}

// play() : joue UNE partie, renvoie false pour arrêter (solde insuffisant…). Le bilan se calcule
// à partir des mises/gains du jeu (événements du portefeuille), donc même les gains différés comptent.
// bet (facultatif) : objet { value } lisible et modifiable, pour faire varier la mise après une perte.
export function bindAuto(root, id, { wallet, game, play, delay = 300, onState, bet = null, turbo = false } = {}) {
  const box = root.querySelector('#' + id);
  if (turbo) {
    const t = box.querySelector('.ab-title');
    t.classList.add('ab-title-row');
    t.innerHTML = `<span>${t.textContent}</span>${turboSwitchHTML(game)}`;
    bindTurbo(box, game, typeof turbo === 'function' ? turbo : null);
  }
  const q = (a) => box.querySelector(`[data-a="${a}"]`);
  const key = 'chibouk_auto_' + id;
  const FIELDS = ['count', 'win', 'loss', 'floor', 'lmode', 'lpct'];
  if (!bet) { q('lmode').closest('label').remove(); }
  const has = (k) => !!q(k);
  try { const s = JSON.parse(localStorage.getItem(key) || '{}'); for (const k of FIELDS) if (s[k] && has(k)) q(k).value = s[k]; } catch {}
  const save = () => { try { const o = {}; for (const k of FIELDS) if (has(k)) o[k] = q(k).value; localStorage.setItem(key, JSON.stringify(o)); } catch {} };
  const note = () => { if (has('lmode')) q('olnote').hidden = !q('lmode').value; };
  FIELDS.forEach((k) => has(k) && q(k).addEventListener('change', () => { save(); note(); }));
  note();
  let running = false, stopAsked = false, done = 0, net = 0, off = null, base = 0, streak = 0;
  const status = () => {
    const total = Math.floor(+q('count').value) || 0;
    const prog = running && bet && has('lmode') && q('lmode').value && streak ? ` · mise ${fmt(bet.value)} (${streak} perte${streak > 1 ? 's' : ''} de suite)` : '';
    q('status').innerHTML = running || done
      ? `${running ? 'En cours' : 'Terminé'} · ${done}${total ? '/' + total : ' (∞)'} paris · bilan <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</b>${prog}`
      : 'Laisse « Nombre » vide pour jouer à l\'infini.';
    q('go').textContent = running ? (stopAsked ? 'Arrêt…' : 'Arrêter l\'auto') : 'Lancer l\'auto';
    q('go').classList.toggle('btn-red', running);
    q('go').classList.toggle('btn-blue', !running);
    FIELDS.forEach((k) => has(k) && (q(k).disabled = running));
  };
  async function start() {
    if (running) return;
    const floor = Math.floor(+q('floor').value) || 0;
    if (floor && wallet.balance < floor) { toast(`Ton solde est déjà sous ${fmt(floor)} : baisse le « Solde min. » pour lancer l'auto`, 'error'); return; }
    const lmode = bet && has('lmode') ? q('lmode').value : '', lpct = lmode ? Math.max(0, Math.min(1000, +q('lpct').value || 0)) : 0;
    running = true; stopAsked = false; done = 0; net = 0; streak = 0;
    base = bet ? bet.value : 0;
    off = wallet.on((e) => {
      if (!e || e.game !== game) return;
      if (e.type === 'bet') net -= e.amount; else if (e.type === 'win' || e.type === 'refund') net += e.amount;
      // progression de mise : on regarde le résultat de chaque partie terminée
      if (e.type === 'round' && lmode && lpct && running) {
        const i = e.info || {}, stake = i.bet || 0;
        const push = i.result === 'push' || i.mult === 1 || (stake && e.payout === stake);
        if (push) return;
        if (e.payout > stake) { streak = 0; bet.value = base; }
        else { streak++; bet.value = Math.max(1, Math.round(bet.value * (lmode === 'up' ? 1 + lpct / 100 : 1 - lpct / 100))); }
        status();
      }
    });
    onState && onState(true); status();
    const total = Math.floor(+q('count').value) || 0;
    const winStop = Math.floor(+q('win').value) || 0, lossStop = Math.floor(+q('loss').value) || 0;
    while (running && !stopAsked && (!total || done < total) && document.body.contains(box)) {
      let ok;
      try { ok = await play(); } catch (e) { console.error(e); ok = false; }
      if (ok === false) break;
      done++;
      status();
      if (winStop && net >= winStop) { toast(`Auto arrêté : objectif de gain atteint (+${fmt(net)})`, 'win'); break; }
      if (lossStop && -net >= lossStop) { toast(`Auto arrêté : limite de perte atteinte (${fmt(net)})`, 'error'); break; }
      if (floor && wallet.balance < floor) { toast(`Auto arrêté : ton solde est passé sous ${fmt(floor)} ${CUR}`, 'error'); break; }
      await sleep(turbo && isTurbo(game) ? Math.min(delay, 30) : delay);
    }
    running = false;
    off && off(); off = null;
    // la mise revient à sa valeur de départ quand l'auto s'arrête
    if (bet && lmode && lpct && base && document.body.contains(box)) bet.value = base;
    streak = 0;
    onState && onState(false);
    if (document.body.contains(box)) status();
  }
  q('go').onclick = () => { if (running) { stopAsked = true; status(); } else start(); };
  status();
  return { get running() { return running; }, stop() { stopAsked = true; running = false; off && off(); off = null; if (bet && base && streak) bet.value = base; streak = 0; } };
}
