// Craps — règles et paiements (sans DOM, testable sous Node)
// Mises : pass, dpass (Don't Pass), odds (cote derrière la Pass Line), lay (cote contre, derrière le Don't Pass),
// field, any7, craps (Any Craps) et place p4 … p10 (Place bets, actives seulement quand un point est établi).

export const POINTS = [4, 5, 6, 8, 9, 10];
// gain (hors mise) pour 1 misé
export const PLACE_PAY = { 4: 9 / 5, 5: 7 / 5, 6: 7 / 6, 8: 7 / 6, 9: 7 / 5, 10: 9 / 5 };
export const ODDS_PAY = { 4: 2, 5: 3 / 2, 6: 6 / 5, 8: 6 / 5, 9: 3 / 2, 10: 2 }; // cote « pour » : cote réelle, 0 % d'avantage
export const LAY_PAY = { 4: 1 / 2, 5: 2 / 3, 6: 5 / 6, 8: 5 / 6, 9: 2 / 3, 10: 1 / 2 }; // cote « contre »
export const FIELD_PAY = { 2: 2, 3: 1, 4: 1, 9: 1, 10: 1, 11: 1, 12: 3 };
export const ODDS_MAX = 3; // cote jusqu'à 3× la mise de ligne
export const BET_KEYS = ['pass', 'dpass', 'odds', 'lay', 'field', 'any7', 'craps', ...POINTS.map((n) => 'p' + n)];
export const ONE_ROLL = ['field', 'any7', 'craps'];
// RTP de chaque mise (pour la page des règles)
export const RTP = { pass: 98.59, dpass: 98.64, odds: 100, lay: 100, field: 97.22, any7: 83.33, craps: 88.89, p6: 98.48, p8: 98.48, p5: 96, p9: 96, p4: 93.33, p10: 93.33 };

// Peut-on poser une mise sur cette case maintenant ?
export function canBet(k, point, bets) {
  if (k === 'pass' || k === 'dpass') return !point; // mises de ligne seulement au « come out »
  if (k === 'odds') return !!point && (bets.pass || 0) > 0;
  if (k === 'lay') return !!point && (bets.dpass || 0) > 0;
  return BET_KEYS.includes(k);
}
export const oddsRoom = (k, bets) => (k === 'odds' ? ODDS_MAX * (bets.pass || 0) - (bets.odds || 0) : k === 'lay' ? ODDS_MAX * (bets.dpass || 0) - (bets.lay || 0) : Infinity);

// Résout un lancer. bets = mises sur la table (déjà payées). Renvoie :
// { point, bets (ce qui reste sur la table), ret (rendu au joueur : mises gagnantes + gains), stake (mises tranchées),
//   won: { case: gain }, lost: [cases], push: [cases], msg }
export function resolve(point, bets, d1, d2) {
  const s = d1 + d2, b = { ...bets }, won = {}, lost = [], push = [];
  let ret = 0, stake = 0, np = point, msg = '';
  const win = (k, profit, keepStake = false) => { const st = b[k] || 0; if (!st) return; const p = Math.floor(st * profit); won[k] = p; ret += p + (keepStake ? 0 : st); stake += st; if (!keepStake) delete b[k]; };
  const lose = (k) => { const st = b[k] || 0; if (!st) return; lost.push(k); stake += st; delete b[k]; };
  // mises d'un seul lancer
  if (FIELD_PAY[s]) win('field', FIELD_PAY[s]); else lose('field');
  if (s === 7) win('any7', 4); else lose('any7');
  if (s === 2 || s === 3 || s === 12) win('craps', 7); else lose('craps');
  if (!point) {
    // lancer de sortie (come out)
    if (s === 7 || s === 11) { win('pass', 1); lose('dpass'); msg = `${s} : naturel ! La Pass Line gagne.`; }
    else if (s === 2 || s === 3 || s === 12) {
      lose('pass');
      if (s === 12) { if (b.dpass) push.push('dpass'); msg = 'Craps 12 : la Pass Line perd, le Don\'t Pass est remboursé (barré).'; }
      else { win('dpass', 1); msg = `Craps ${s} : la Pass Line perd, le Don't Pass gagne.`; }
    } else { np = s; msg = `Le point est ${s}.`; }
    // les mises Place ne travaillent pas au lancer de sortie
  } else {
    if (s === point) {
      win('pass', 1); win('odds', ODDS_PAY[point]); lose('dpass'); lose('lay');
      np = null; msg = `${s} : le point est fait ! La Pass Line gagne, le Don't Pass perd.`;
    } else if (s === 7) {
      lose('pass'); lose('odds'); win('dpass', 1); win('lay', LAY_PAY[point]);
      np = null; msg = '7 : sept dehors ! La Pass Line perd, le Don\'t Pass gagne.';
    }
    // mises Place : le numéro sort → gain (la mise reste) ; 7 → perdues
    for (const n of POINTS) {
      const k = 'p' + n;
      if (!b[k]) continue;
      if (s === n) win(k, PLACE_PAY[n], true);
      else if (s === 7) lose(k);
    }
    if (!msg) msg = `${s} : on relance (le point reste ${point}).`;
  }
  return { point: np, bets: b, ret, stake, won, lost, push, msg, sum: s };
}
