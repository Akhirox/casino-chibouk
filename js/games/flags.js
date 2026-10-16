// Quiz drapeaux — jeu gratuit : à quel pays appartient ce drapeau ? Mode facile (4 choix) ou expert (à écrire)
import { CONFIG } from '../config.js';
import { CAPITALS, ALIASES } from './capitals-data.js';
import { FLAG_ISO, FLAG_EXTRA, FLAG_EXCLUDE } from './flags-data.js';
import { mountMCQ, makeQ, pickDistinct, shuffle } from './mcq.js';

// [pays, code ISO, région, niveau]
export const FLAGS = [
  ...CAPITALS.filter((c) => FLAG_ISO[c[0]] && !FLAG_EXCLUDE.includes(c[0])).map((c) => [c[0], FLAG_ISO[c[0]], c[2], c[3]]),
  ...FLAG_EXTRA,
];
const ALL = FLAGS.map((f) => f[0]);
export const flagUrl = (code) => `data/flags/${code}.svg`;
// Dans la page, le drapeau est affiché depuis une copie en mémoire (adresse « blob: ») : le code du pays
// n'apparaît plus dans la page (avant, data/flags/fr.svg donnait la réponse à qui lisait le code de la page).
const blobs = new Map();
const flagBlob = (code) => {
  if (!blobs.has(code)) blobs.set(code, fetch(flagUrl(code)).then((r) => r.blob()).then((b) => URL.createObjectURL(b)).catch(() => flagUrl(code)));
  return blobs.get(code);
};
const inPage = typeof window !== 'undefined' && typeof fetch === 'function' && typeof URL !== 'undefined' && !!URL.createObjectURL;

export function buildFlags(list = FLAGS, n = 10, mode = 'easy') {
  const used = new Set();
  const qs = [];
  for (let i = 0; i < n; i++) {
    const tiers = i < 4 ? [1] : i < 7 ? [1, 2] : [2, 3];
    let pool = list.filter((c) => tiers.includes(c[3]) && !used.has(c[0]));
    if (!pool.length) pool = list.filter((c) => !used.has(c[0]));
    const [country, code, region] = pickDistinct(pool, 1)[0];
    used.add(country);
    const img = inPage ? '' : flagUrl(code), imgP = inPage ? flagBlob(code) : null;
    if (mode === 'expert') {
      qs.push({ type: 'text', label: 'À quel pays appartient ce drapeau ?', img, imgP, placeholder: 'Écris le pays…', accept: [country, ...(ALIASES[country] || [])], reject: ALL.filter((x) => x !== country) });
      continue;
    }
    // leurres de la même région : les drapeaux se ressemblent plus, c'est plus drôle
    const near = list.filter((c) => c[0] !== country && c[2] === region);
    const far = list.filter((c) => c[0] !== country && c[2] !== region);
    const others = [...pickDistinct(near, 3), ...pickDistinct(far, 3)].slice(0, 3);
    qs.push({ ...makeQ({ label: 'À quel pays appartient ce drapeau ?', big: '', right: country, wrong: others.map((c) => c[0]) }), img, imgP });
  }
  return qs;
}

export function mount(view, ctx) {
  return mountMCQ(view, ctx, {
    kind: 'flags',
    title: 'Quiz <span>drapeaux</span>',
    introTitle: (m) => `${CONFIG.QUIZ_QUESTIONS} drapeaux, ${m.seconds} secondes chacun`,
    introText: `Reconnais le pays à son drapeau, parmi ${FLAGS.length} pays. De plus en plus corsé au fil des questions !`,
    seconds: CONFIG.CAPITALS_SECONDS,
    modes: [
      { key: 'easy', label: 'Facile', desc: '4 propositions, souvent des voisins aux drapeaux proches.', seconds: CONFIG.CAPITALS_SECONDS },
      { key: 'expert', label: 'Expert', desc: 'Aucune proposition : écris le nom du pays (accents et petites fautes tolérés).', seconds: CONFIG.CAPITALS_EXPERT_SECONDS,
        perCorrect: CONFIG.CAPITALS_EXPERT_PER_CORRECT, perfectBonus: CONFIG.CAPITALS_EXPERT_PERFECT_BONUS, stat: 'Expert' },
    ],
    load: async () => FLAGS,
    build: buildFlags,
  });
}
