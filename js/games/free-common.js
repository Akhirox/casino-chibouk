// Petits outils communs aux jeux de réflexion gratuits (Queens, Tango, Sudoku, Démineur, Snake, Pinpoint)
import { $, $$, money, fmt, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';

export const fmtTime = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; };
export const fmtTimeLong = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m} min ${String(s).padStart(2, '0')}` : `${s} s`; };

// Chrono (ou compte à rebours si limit) affiché dans `el`, mis en pause quand l'onglet est caché
export function makeTimer(el, { limit = 0, onEnd } = {}) {
  let start = 0, acc = 0, running = false, iv = null;
  const elapsed = () => acc + (running ? (performance.now() - start) / 1000 : 0);
  const draw = () => {
    if (!el) return;
    const e = elapsed();
    el.textContent = limit ? fmtTime(limit - e) : fmtTime(e);
    el.classList.toggle('low', !!limit && limit - e <= Math.min(30, limit * 0.15));
    if (limit && e >= limit && running) { stop(); onEnd && onEnd(); }
  };
  function go() { if (running) return; running = true; start = performance.now(); iv = setInterval(draw, 250); draw(); }
  function stop() { if (!running) return; acc += (performance.now() - start) / 1000; running = false; clearInterval(iv); draw(); }
  const onVis = () => { if (document.visibilityState === 'hidden' && running) { stop(); paused = true; } else if (document.visibilityState === 'visible' && paused) { paused = false; go(); } };
  let paused = false;
  document.addEventListener('visibilitychange', onVis);
  return {
    start: go, stop, get elapsed() { return elapsed(); }, get running() { return running; },
    reset() { stop(); acc = 0; paused = false; draw(); },
    destroy() { stop(); document.removeEventListener('visibilitychange', onVis); },
  };
}

// Boutons de choix du niveau (réutilise le style des quiz)
export function modesHTML(levels, cur, extra = (l) => '') {
  return `<div class="mcq-modes ${levels.length === 3 ? 'three' : ''}">${levels.map((l, i) => `<button type="button" class="mcq-mode ${i === cur ? 'on' : ''}" data-lv="${i}"><b>${l.name}</b><span>${l.desc}</span><small>${extra(l, i)}</small></button>`).join('')}</div>`;
}
export function bindModes(root, onPick) { $$('.mcq-mode[data-lv]', root).forEach((b) => (b.onclick = () => onPick(+b.dataset.lv))); }

// Niveau mémorisé
export function savedLevel(key, def = 0, max = 2) { try { const v = Math.floor(+localStorage.getItem(key)); if (v >= 0 && v <= max) return v; } catch {} return def; }
export function saveLevel(key, v) { try { localStorage.setItem(key, v); } catch {} }

// Carte de fin de partie
export function endCardHTML({ win, title, text, amount, again = 'Rejouer', extraBtn = '' }) {
  return `<div class="qz-card fg-end">${monkeySVG(win ? { crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' } : { wink: false })}
    <h2>${title}</h2><p>${text}${amount ? `<br><b class="gold">+${money(amount)}</b> ajoutés à ton solde.` : ''}</p>
    <div class="qz-end-btns"><button class="btn btn-gold btn-lg" data-again>${again}</button>${extraBtn}</div></div>`;
}

// Bonus de vitesse : +50 % si résolu sous le temps de référence
export const speedBonus = (base, sec, par) => (sec <= par ? Math.round(base * 0.5) : 0);
export { fmt, CUR };
