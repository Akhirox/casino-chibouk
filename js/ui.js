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
