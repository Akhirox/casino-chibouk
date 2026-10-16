// Retour effectif des jeux de casino avec les avantages VIP (rakeback + bonus de passage de rang).
// Pour chaque tranche de mises : RTP du jeu + rakeback du rang en cours + bonus de passage ÷ taille de la tranche.
// Usage : node tools/vip-rtp.mjs
import { VIP, RAKE_WEIGHT } from '../js/progress.js';
const GAMES = [
  ['Plinkoko (mode le plus généreux, 12 rangées élevé)', 0.99116, 'plinko'],
  ['Plinkoko (mode le moins généreux, 8 rangées moyen)', 0.98906, 'plinko'],
  ['Dice, Limbo, Keno, Roue, Mines, Tower, Hi-Lo, Crash', 0.99, 'dice'],
  ['Blackjack (stratégie parfaite)', 0.995, 'blackjack'],
  ['Tickets à gratter', 0.98, 'scratch'],
  ['Roulette', 0.973, 'roulette'],
  ['Chibouk Slot (avec le jackpot)', 1.016, 'slots'],
];
const pct = (x) => (x * 100).toFixed(2).replace('.', ',') + ' %';
console.log('Tranche (rang visé)'.padEnd(22), 'rake', 'bonus', '|', GAMES.map((g) => g[0].split(' (')[0].split(',')[0]).join(' | '));
for (let i = 1; i <= VIP.length; i++) {
  const prev = VIP[i - 1], next = VIP[i];
  const bonus = next ? next.up / (next.min - prev.min) : 0;
  const label = next ? `→ ${next.name}` : `${prev.name} (max)`;
  const cells = GAMES.map(([, rtp, g]) => pct(rtp + prev.rb * (RAKE_WEIGHT[g] ?? 1) + bonus));
  console.log(label.padEnd(22), pct(prev.rb), pct(bonus), '|', cells.join(' | '));
}
