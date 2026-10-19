// Affichage des récompenses avec bonus : « +100 → +340 », et au survol, le détail des bonus qui s'appliquent.
import { vipOf, permBonus, wheelPerm } from './progress.js';
import { boostMult, chalBoost, lootPerm } from './loot.js';
import { cosBonus } from './bonus.js';
import { fmt, esc } from './ui.js';
import { coinSVG } from './art.js';

let W = null;
export const setRewardWallet = (w) => { W = w; };
const xf = (m) => '×' + String(Math.round(m * 100) / 100).replace('.', ',');
const pf = (x) => '+' + (Math.round(x * 1000) / 10).toLocaleString('fr-FR') + ' %';

// Gains des mini-jeux : base × VIP × (1 + bonus permanent) × (boost des caisses + cadre)
export function freeInfo(game = '') {
  if (!W) return { mult: 1, parts: [] };
  const p = W.p, vip = vipOf(W.stats.totalWagered), perm = permBonus(p), boost = boostMult(p, game), cb = cosBonus(p, 'free');
  const fm = vip.mult * (1 + perm);
  const parts = [];
  if (vip.mult > 1) parts.push([`Rang VIP ${vip.name}`, xf(vip.mult)]);
  if (perm > 0) parts.push(['Bonus permanent des caisses', pf(perm)]);
  if (boost > 1) parts.push(['Boosts mini-jeux en cours', xf(boost)]);
  if (cb > 0) parts.push(['Cadre équipé', pf(cb)]);
  return { mult: fm * (boost + cb), parts };
}
// Quêtes du jour : VIP × bonus permanent × titre équipé
export function questInfo() {
  if (!W) return { mult: 1, parts: [] };
  const p = W.p, vip = vipOf(W.stats.totalWagered), perm = permBonus(p), cb = cosBonus(p, 'daily');
  const parts = [];
  if (vip.mult > 1) parts.push([`Rang VIP ${vip.name}`, xf(vip.mult)]);
  if (perm > 0) parts.push(['Bonus permanent des caisses', pf(perm)]);
  if (cb > 0) parts.push(['Titre équipé', pf(cb)]);
  return { mult: vip.mult * (1 + perm) * (1 + cb), parts };
}
// Défis de la jungle : bonus VIP réduit × bonus permanent « défis » × boosts « défis »
export function challengeInfo(chMult) {
  if (!W) return { mult: 1, parts: [] };
  const p = W.p, cp = lootPerm(p, 'chalp'), cb = chalBoost(p);
  const parts = [];
  if (chMult > 1) parts.push(['Bonus VIP (réduit sur les défis)', xf(chMult)]);
  if (cp > 0) parts.push(['Coffres royaux : défis', pf(cp)]);
  if (cb > 1) parts.push(['Boosts défis en cours', xf(cb)]);
  return { mult: chMult * (1 + cp) * cb, parts };
}
// Roue du jour : VIP × bonus permanent × (titre + coffres royaux)
export function wheelInfo() {
  if (!W) return { mult: 1, parts: [] };
  const p = W.p, vip = vipOf(W.stats.totalWagered), perm = permBonus(p), cb = cosBonus(p, 'daily'), wp = wheelPerm(p);
  const parts = [];
  if (vip.mult > 1) parts.push([`Rang VIP ${vip.name}`, xf(vip.mult)]);
  if (perm > 0) parts.push(['Bonus permanent des caisses', pf(perm)]);
  if (cb > 0) parts.push(['Titre équipé', pf(cb)]);
  if (wp > 0) parts.push(['Coffres royaux : roue du jour', pf(wp)]);
  return { mult: vip.mult * (1 + perm) * (1 + cb + wp), parts };
}

// « +100 → +340 » avec le détail au survol (ou juste « +100 » sans bonus)
export function bonusHTML(base, info, { total = null, plus = '+' } = {}) {
  base = Math.round(base);
  const tot = total != null ? Math.round(total) : Math.round(base * info.mult);
  if (!info.parts.length || tot <= base) return `${plus}${fmt(base)}`;
  return `<span class="rwb" tabindex="0">${plus}${fmt(base)}<i>→</i><b>${plus}${fmt(tot)}</b><span class="rwb-tip"><b>Tes bonus</b>${info.parts.map(([l, v]) => `<span><em>${esc(l)}</em><strong>${v}</strong></span>`).join('')}<span class="rwb-tot"><em>Total</em><strong>${xf(tot / Math.max(1, base))}</strong></span></span></span>`;
}
// Multiplicateur seul (« ×2,4 ») avec le détail au survol
export function multHTML(info) {
  if (!info.parts.length || !(info.mult > 1)) return '';
  return `<span class="rwb" tabindex="0"><b>${xf(info.mult)}</b><span class="rwb-tip"><b>Tes bonus</b>${info.parts.map(([l, v]) => `<span><em>${esc(l)}</em><strong>${v}</strong></span>`).join('')}<span class="rwb-tot"><em>Total</em><strong>${xf(info.mult)}</strong></span></span></span>`;
}
// Remplace les « +N » d'un texte de récompense de mini-jeu par leur version avec bonus
export function withFreeBonus(text, game) {
  const info = freeInfo(game);
  if (!info.parts.length) return text;
  return String(text).replace(/\+(\d[\d   ]*)/g, (m, n) => bonusHTML(+String(n).replace(/\D/g, ''), info) + (/\s$/.test(n) ? ' ' : ''));
}

// Montant réellement crédité à la fin d'une partie gratuite : « +100 → +340 🪙 » (d'après wallet.lastFree)
export function gotHTML(amount, game = '') {
  amount = Math.round(amount || 0);
  const lf = W && W.lastFree;
  const ok = lf && lf.base === amount && Date.now() - lf.at < 15000;
  const info = freeInfo(ok ? lf.kind : game);
  return `<span class="money">${bonusHTML(amount, info, { total: ok ? lf.total : null })}${coinSVG('coin coin-inline')}</span>`;
}
