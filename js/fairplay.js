// Fair-play des mini-jeux : détection des parties résolues par un programme (solveur, script, extension) et sanctions.
//
// Tout le jeu tourne dans le navigateur : un tricheur très motivé peut toujours contourner ces contrôles.
// Le but est d'arrêter la triche facile (solveur qui remplit la grille en 2 secondes, script qui clique à la place
// du joueur) et de tout journaliser pour que l'admin voie le reste (page « Journal »).
//
// Signaux utilisés (sur l'horloge réelle, même si l'onglet a été mis en arrière-plan) :
//  - temps total sous le minimum humain (le seul fait de saisir la réponse prend plus de temps)
//  - pas assez d'actions pour avoir rempli la grille (réponse injectée sans clic ni touche)
//  - actions « simulées » (événements créés par un script : event.isTrusted === false)
//  - rythme robotique (une grosse part des actions espacées de moins de 60 ms)
import { fmt, CUR } from './ui.js';
import { endCardHTML } from './games/free-common.js';

const fr = (x) => String(x).replace('.', ',');
const LOCKS = [60, 6 * 60, 24 * 60, 7 * 24 * 60]; // minutes de blocage : 1 h, 6 h, 24 h, puis 7 jours
export const FINE_MULT = 5; // amende = 5 × la récompense que la partie aurait rapportée

export function fairState(wallet) {
  const f = wallet.p.fair || (wallet.p.fair = {});
  f.strikes = f.strikes || {}; f.lock = f.lock || {};
  return f;
}
export const lockedUntil = (wallet, game) => { const t = (wallet.p.fair && wallet.p.fair.lock && wallet.p.fair.lock[game]) || 0; return t > Date.now() ? t : 0; };
export const lockText = (until) => new Date(until).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
export function lockBannerHTML(wallet, game) {
  const t = lockedUntil(wallet, game);
  return t ? `<div class="fair-lock"><b>Jeu bloqué jusqu'à ${lockText(t)}</b><span>Une partie précédente a été résolue de façon impossible à la main (solveur ou script). Les récompenses de ce jeu reprendront après le blocage.</span></div>` : '';
}

// Surveille les actions du joueur pendant une partie
export function createGuard(stage) {
  const t0 = Date.now();
  let trusted = 0, untrusted = 0, last = 0, fast = 0, gaps = 0;
  const onAct = (e) => {
    if (e.type === 'keydown' && (e.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key))) return;
    if (!e.isTrusted) { untrusted++; return; }
    if (e.type === 'click' || e.type === 'submit') return; // déjà compté par son pointerdown / sa touche Entrée
    if (e.type === 'input') { trusted++; return; }
    trusted++;
    const now = performance.now();
    if (last) { gaps++; if (now - last < 60) fast++; }
    last = now;
  };
  const types = ['pointerdown', 'click', 'submit', 'keydown', 'input'];
  types.forEach((t) => stage.addEventListener(t, onAct, true));
  // les jeux au clavier écoutent le document : on compte aussi ces touches (une seule fois)
  const onDocKey = (e) => { if (!stage.contains(e.target)) onAct(e); };
  document.addEventListener('keydown', onDocKey, true);
  const destroy = () => { types.forEach((t) => stage.removeEventListener(t, onAct, true)); document.removeEventListener('keydown', onDocKey, true); };
  return {
    destroy,
    result() { return { sec: (Date.now() - t0) / 1000, actions: trusted, untrusted, fastShare: gaps ? fast / gaps : 0 }; },
  };
}

// Verdict d'une partie gagnée. rules = { minActions, cheatSec, fastSec } ; renvoie { flag: 'ok' | 'fast' | 'cheat', reason, ... }
export function judge(guard, rules = {}) {
  const r = guard ? guard.result() : { sec: 999, actions: 999, untrusted: 0, fastShare: 0 };
  guard && guard.destroy();
  const s = Math.round(r.sec * 10) / 10;
  let flag = 'ok', reason = '';
  if (r.untrusted >= 3) { flag = 'cheat'; reason = `${r.untrusted} actions simulées par un script`; }
  else if (rules.minActions && r.actions < rules.minActions) { flag = 'cheat'; reason = `partie résolue avec seulement ${r.actions} action${r.actions > 1 ? 's' : ''} du joueur (il en faut au moins ${rules.minActions})`; }
  else if (rules.cheatSec && r.sec < rules.cheatSec) { flag = 'cheat'; reason = `partie résolue en ${fr(s)} s, alors qu'il faut au moins ${fr(rules.cheatSec)} s rien que pour tout saisir`; }
  else if (!rules.noRobot && r.actions >= 15 && r.fastShare >= 0.4) { flag = 'cheat'; reason = `rythme robotique (${Math.round(r.fastShare * 100)} % des actions à moins de 60 ms d'intervalle)`; }
  else if (rules.fastSec && r.sec < rules.fastSec) { flag = 'fast'; reason = `partie résolue en ${fr(s)} s, sous le minimum de ${fr(rules.fastSec)} s pour ce niveau`; }
  return { flag, reason, sec: s, actions: r.actions, untrusted: r.untrusted, fastShare: Math.round(r.fastShare * 100) / 100 };
}

// Sanction d'une triche évidente : amende + blocage du jeu (de plus en plus long), et entrée au journal
export function punish(wallet, game, lv, v, reward) {
  const f = fairState(wallet);
  const n = (f.strikes[game] || 0) + 1;
  f.strikes[game] = n;
  const mins = LOCKS[Math.min(n - 1, LOCKS.length - 1)];
  f.lock[game] = Date.now() + mins * 60000;
  const fine = wallet.penalty(game, Math.round(reward * FINE_MULT));
  wallet.emit({ type: 'fairplay', game, lv, flag: 'cheat', reason: v.reason, sec: v.sec, actions: v.actions, untrusted: v.untrusted, fastShare: v.fastShare, medianMs: v.medianMs, fine, strikes: n, lockMin: mins, amount: 0 });
  return { fine, mins, strikes: n };
}
// Partie trop rapide (sans preuve de triche) : pas de récompense, simple entrée au journal
export function tooFast(wallet, game, lv, v) {
  wallet.emit({ type: 'fairplay', game, lv, flag: 'fast', reason: v.reason, sec: v.sec, actions: v.actions, untrusted: v.untrusted, fastShare: v.fastShare, medianMs: v.medianMs, amount: 0 });
}

const dureeTxt = (m) => (m >= 1440 ? `${Math.round(m / 1440)} jour${m >= 2880 ? 's' : ''}` : `${Math.round(m / 60)} h`);
// Carte de fin de partie pour une partie refusée
export function refusedHTML(v, p, extraBtn = '') {
  if (v.flag === 'cheat') {
    return endCardHTML({ win: false, title: 'Triche détectée', again: 'Retour', extraBtn,
      text: `${v.reason[0].toUpperCase() + v.reason.slice(1)}.<br>Amende : <b class="neg">−${fmt(p.fine)} ${CUR}</b>. Jeu bloqué pendant <b>${dureeTxt(p.mins)}</b>${p.strikes > 1 ? ` (récidive n°${p.strikes})` : ''}.<br><small class="muted">La partie est enregistrée dans le journal.</small>` });
  }
  return endCardHTML({ win: false, title: 'Trop rapide pour être vrai', extraBtn,
    text: `${v.reason[0].toUpperCase() + v.reason.slice(1)}.<br>Aucune récompense pour cette partie, et elle est signalée dans le journal.` });
}

// Quiz : verdict à partir des temps de réponse (ms entre l'affichage de la question et la réponse).
// Lire la question, reconnaître la réponse et cliquer prend bien plus de 0,5 s à un humain, même très entraîné.
export function judgeReactions(guard, rts, { minAnswers = 4, cheatMs = 350, fastMs = 550 } = {}) {
  const r = guard ? guard.result() : { sec: 0, actions: 0, untrusted: 0, fastShare: 0 };
  guard && guard.destroy();
  const sorted = [...rts].sort((a, b) => a - b), med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const instant = rts.filter((t) => t < 250).length;
  let flag = 'ok', reason = '';
  if (r.untrusted >= 3) { flag = 'cheat'; reason = `${r.untrusted} actions simulées par un script`; }
  else if (rts.length >= minAnswers && med < cheatMs) { flag = 'cheat'; reason = `réponses données en ${Math.round(med)} ms en moyenne, plus vite que le temps de lire la question`; }
  else if (instant >= 3) { flag = 'cheat'; reason = `${instant} réponses en moins de 250 ms`; }
  else if (rts.length >= minAnswers && med < fastMs) { flag = 'fast'; reason = `réponses données en ${Math.round(med)} ms en moyenne, c'est trop rapide`; }
  return { flag, reason, sec: Math.round(r.sec * 10) / 10, actions: r.actions, untrusted: r.untrusted, fastShare: Math.round(r.fastShare * 100) / 100, medianMs: Math.round(med) };
}
