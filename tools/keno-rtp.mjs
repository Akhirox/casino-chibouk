// Vérifie le RTP exact des tables du Keno : node tools/keno-rtp.mjs
import { KENO_TABLES, kenoRTP } from '../js/games/keno-math.js';
for (const risk of Object.keys(KENO_TABLES)) {
  console.log(risk.padEnd(7), Array.from({ length: 10 }, (_, i) => (kenoRTP(risk, i + 1) * 100).toFixed(2) + ' %').join('  '));
}
