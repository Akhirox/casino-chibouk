// Quiz des capitales — jeu gratuit : pays → capitale ou capitale → pays
import { CONFIG } from '../config.js';
import { CAPITALS } from './capitals-data.js';
import { mountMCQ, makeQ, pickDistinct, shuffle } from './mcq.js';

// 10 questions, moitié dans chaque sens, de plus en plus difficiles
export function buildCapitals(list = CAPITALS, n = 10) {
  const used = new Set();
  const dirs = shuffle(Array.from({ length: n }, (_, i) => i % 2 === 0));
  const qs = [];
  for (let i = 0; i < n; i++) {
    const tiers = i < 4 ? [1] : i < 7 ? [1, 2] : [2, 3];
    let pool = list.filter((c) => tiers.includes(c[3]) && !used.has(c[0]));
    if (!pool.length) pool = list.filter((c) => !used.has(c[0]));
    const [country, capital, region] = pickDistinct(pool, 1)[0];
    used.add(country);
    // leurres de la même région en priorité, puis n'importe où
    const near = list.filter((c) => c[0] !== country && c[2] === region);
    const far = list.filter((c) => c[0] !== country && c[2] !== region);
    const others = [...pickDistinct(near, 3), ...pickDistinct(far, 3)].slice(0, 3);
    const toCapital = dirs[i];
    qs.push(makeQ(toCapital
      ? { label: 'Quelle est la capitale de ce pays ?', big: country, right: capital, wrong: others.map((c) => c[1]) }
      : { label: 'De quel pays est-ce la capitale ?', big: capital, right: country, wrong: others.map((c) => c[0]) }));
  }
  return qs;
}

export function mount(view, ctx) {
  return mountMCQ(view, ctx, {
    kind: 'capitals',
    title: 'Quiz <span>capitales</span>',
    introTitle: `${CONFIG.QUIZ_QUESTIONS} questions, ${CONFIG.CAPITALS_SECONDS} secondes chacune`,
    introText: 'On te donne un pays, trouve sa capitale… ou l\'inverse ! 4 réponses au choix, de plus en plus corsé.',
    seconds: CONFIG.CAPITALS_SECONDS,
    load: async () => CAPITALS,
    build: buildCapitals,
  });
}
