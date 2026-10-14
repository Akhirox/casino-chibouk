// Petits utilitaires d'interface
import { coinSVG } from './art.js';
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
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
}

export function modal({ title = '', html = '', buttons = [{ label: 'OK', value: true, primary: true }], dismissable = true, cls = '' }) {
  return new Promise((resolve) => {
    const m = h(`<div class="modal-backdrop"><div class="modal ${cls}" role="dialog" aria-modal="true">
      ${title ? `<h2 class="modal-title">${title}</h2>` : ''}
      <div class="modal-body">${html}</div>
      <div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'btn-gold' : 'btn-ghost'}" data-i="${i}">${b.label}</button>`).join('')}</div>
    </div></div>`);
    const close = (v) => { m.classList.remove('show'); setTimeout(() => m.remove(), 250); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(null); };
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (b) close(buttons[+b.dataset.i].value);
      else if (e.target === m && dismissable) close(null);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(m);
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
export function coinRain(count = 30) {
  const layer = h('<div class="coin-rain" aria-hidden="true"></div>');
  document.body.append(layer);
  for (let i = 0; i < count; i++) {
    const c = h(`<div class="rain-coin">${coinSVG('coin')}</div>`);
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
    set disabled(d) { input.disabled = d; box.querySelectorAll('button').forEach((b) => (b.disabled = d)); },
  };
}

/* ---------------- Paris automatiques (commun à tous les jeux) ----------------
   Nombre de paris libre (vide = infini), arrêt optionnel sur gain ou perte. */
export function autoHTML(id, title = 'Paris automatiques', extra = '') {
  return `<div class="auto-box2" id="${id}">
    <div class="ab-title">${title}</div>
    ${extra}
    <div class="ab-grid">
      <label>Nombre<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="∞" data-a="count"></label>
      <label>Stop gain ≥<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="—" data-a="win"></label>
      <label>Stop perte ≥<input class="bet-input" type="number" min="0" step="1" inputmode="numeric" placeholder="—" data-a="loss"></label>
    </div>
    <button type="button" class="btn btn-blue wide ab-go" data-a="go">Lancer l'auto</button>
    <div class="ab-status" data-a="status"></div>
  </div>`;
}

// play() : joue UNE partie, renvoie false pour arrêter (solde insuffisant…). Le bilan se calcule
// à partir des mises/gains du jeu (événements du portefeuille), donc même les gains différés comptent.
export function bindAuto(root, id, { wallet, game, play, delay = 300, onState } = {}) {
  const box = root.querySelector('#' + id);
  const q = (a) => box.querySelector(`[data-a="${a}"]`);
  const key = 'chibouk_auto_' + id;
  try { const s = JSON.parse(localStorage.getItem(key) || '{}'); for (const k of ['count', 'win', 'loss']) if (s[k]) q(k).value = s[k]; } catch {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify({ count: q('count').value, win: q('win').value, loss: q('loss').value })); } catch {} };
  ['count', 'win', 'loss'].forEach((k) => q(k).addEventListener('change', save));
  let running = false, stopAsked = false, done = 0, net = 0, off = null;
  const status = () => {
    const total = Math.floor(+q('count').value) || 0;
    q('status').innerHTML = running || done
      ? `${running ? 'En cours' : 'Terminé'} · ${done}${total ? '/' + total : ' (∞)'} paris · bilan <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</b>`
      : 'Laisse « Nombre » vide pour jouer à l\'infini.';
    q('go').textContent = running ? (stopAsked ? 'Arrêt…' : 'Arrêter l\'auto') : 'Lancer l\'auto';
    q('go').classList.toggle('btn-red', running);
    q('go').classList.toggle('btn-blue', !running);
    ['count', 'win', 'loss'].forEach((k) => (q(k).disabled = running));
  };
  async function start() {
    if (running) return;
    running = true; stopAsked = false; done = 0; net = 0;
    off = wallet.on((e) => {
      if (!e || e.game !== game) return;
      if (e.type === 'bet') net -= e.amount; else if (e.type === 'win' || e.type === 'refund') net += e.amount;
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
      await sleep(delay);
    }
    running = false;
    off && off(); off = null;
    onState && onState(false);
    if (document.body.contains(box)) status();
  }
  q('go').onclick = () => { if (running) { stopAsked = true; status(); } else start(); };
  status();
  return { get running() { return running; }, stop() { stopAsked = true; running = false; off && off(); off = null; } };
}
