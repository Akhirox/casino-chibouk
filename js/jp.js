// Jetons Poker (JP) côté site : solde en direct et gains. Les JP ne passent par aucun bonus ni multiplicateur :
// 50 à 200 JP avec la roue du jour (tirés par le serveur), 10 JP par mini-jeu terminé (au plus un toutes les 30 s).
import { toast, fmt } from './ui.js';
import { icon } from './art.js';

let state = { jp: 0, loaded: false }, backend = null, lastTry = 0;
const subs = new Set();
const emit = () => subs.forEach((cb) => { try { cb(state); } catch (e) { console.error(e); } });

export function initJP(be, wallet) {
  backend = be;
  state = { jp: 0, loaded: false };
  const offs = [];
  if (be.watchJP) offs.push(be.watchJP(wallet.uid, (d) => { if (!d) return; state = { ...d, jp: Math.floor(d.jp || 0), loaded: true }; emit(); }));
  // mini-jeu terminé (gain d'un jeu gratuit ou niveau de casse-briques) : 10 JP
  offs.push(wallet.on((e) => { if (e && (e.type === 'free' || e.type === 'breaker')) earnGame(); }));
  return () => offs.forEach((f) => f && f());
}
export const jpState = () => state;
export function onJP(cb) { subs.add(cb); return () => subs.delete(cb); }
export const jpHTML = (n, cls = '') => `<span class="pkj-amt ${cls}">${icon('jp')}<b>${fmt(Math.floor(n || 0))}</b> JP</span>`;

async function earnGame() {
  if (!backend || !backend.pokerCall || Date.now() - lastTry < 30000) return;
  lastTry = Date.now();
  const r = await backend.pokerCall('earn', null, { kind: 'game' });
  if (r && r.ok && r.amount > 0) toast(`<span class="pkj-toast">${icon('jp')}+${fmt(r.amount)} JP <small>mini-jeu terminé</small></span>`, 'info', 2200);
}
// Roue du jour : JP tirés par le serveur (une fois par jour). Renvoie le montant gagné (0 si déjà reçu)
export async function earnWheel() {
  if (!backend || !backend.pokerCall) return 0;
  const r = await backend.pokerCall('earn', null, { kind: 'wheel' });
  return r && r.ok ? r.amount || 0 : 0;
}
export const jpWheelToday = (today) => state.loaded && state.wheelDay === today;
