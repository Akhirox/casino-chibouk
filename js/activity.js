// Présence du joueur : sert à couper les lectures en arrière-plan (fil, transferts, classement) quand personne ne joue.
// Un onglet resté ouvert sur un 2e écran ou un téléphone posé sur la table ne coûte alors plus rien à la base.
import { CONFIG } from './config.js';

let last = Date.now();
const wakers = new Set();

export function bump() {
  const was = isIdle();
  last = Date.now();
  if (was) wakers.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
}
// Inactif : onglet caché, ou aucun clic / touche / partie depuis IDLE_MS
export const isIdle = () => document.visibilityState === 'hidden' || Date.now() - last > CONFIG.IDLE_MS;
// Rappel quand le joueur revient après une pause (pour rafraîchir tout de suite ce qui a été mis en pause)
export function onWake(cb) { wakers.add(cb); return () => wakers.delete(cb); }

let started = false;
export function initActivity() {
  if (started) return;
  started = true;
  let t = 0;
  const on = () => { const n = Date.now(); if (n - t > 1000) { t = n; bump(); } };
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'pointermove'].forEach((e) => window.addEventListener(e, on, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { last = 0; bump(); } });
}
