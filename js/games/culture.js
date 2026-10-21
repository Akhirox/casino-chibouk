// Quiz Culture G — jeu gratuit, mode expert uniquement : 10 questions de culture générale (1 700 questions,
// 26 thèmes), réponse à écrire. Fautes de frappe, accents, articles et petites variantes tolérés.
import { CG, CG_CATS } from './culture-data.js';
import { mountMCQ, normalize, lev } from './mcq.js';
import { randInt } from './slots-math.js';
import { esc } from '../ui.js';

// [catégorie, question, réponses, image, anecdote, image indispensable]
export const QUESTIONS = CG.map(([c, q, a, img, an, need], i) => ({ i, cat: CG_CATS[c], q, a, img: img || '', an: an || '', need: !!need }));
export const CULTURE_COUNT = QUESTIONS.length;

const NUM = { zero: '0', un: '1', une: '1', deux: '2', trois: '3', quatre: '4', cinq: '5', six: '6', sept: '7', huit: '8', neuf: '9', dix: '10', onze: '11', douze: '12', treize: '13', quatorze: '14', quinze: '15', seize: '16', vingt: '20', cent: '100', mille: '1000' };
const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10', xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15', xvi: '16', xvii: '17', xviii: '18' };
// forme comparable : minuscules, sans accents ni ponctuation, sans articles ni petits mots, nombres en chiffres
export function canon(s) {
  return normalize(String(s || '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').replace(/&/g, ' et '))
    .split(' ').filter((w) => w && !['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux', 'the', 'a', 'en', 'et'].includes(w))
    .map((w) => NUM[w] || ROMAN[w] || w).join(' ');
}
const tolFor = (n) => (n >= 12 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0);
// Bonne réponse ? Exacte, à quelques fautes près (selon la longueur), collée (« newyork »), ou contenue dans la phrase tapée
export function cultureMatch(input, answers) {
  const v = canon(input) || normalize(input);
  if (!v) return false;
  const vs = v.replace(/ /g, '');
  for (const a of answers) {
    const c = canon(a) || normalize(a); // « L », « D »… : réponse faite uniquement d'un « petit mot »
    if (!c) continue;
    const cs = c.replace(/ /g, '');
    if (v === c || vs === cs) return true;
    // les nombres (années, scores…) doivent être exacts ; le reste tolère des fautes selon la longueur
    if (!/\d/.test(cs) && lev(vs, cs) <= tolFor(cs.length)) return true;
    // réponse entière dans une phrase un peu plus longue (« c'est nolan »)
    if (cs.length >= 4 && (' ' + v + ' ').includes(' ' + c + ' ') && v.length <= c.length + 14) return true;
    // réponse incomplète mais claire : les mots tapés se suivent dans la réponse et en couvrent au moins 55 %
    // (« crise des missiles » pour « La crise des missiles de Cuba » ; mais pas « Jules » pour « Jules César »)
    if (partial(v.split(' '), c.split(' '), cs.length)) return true;
  }
  return false;
}

function partial(iw, aw, total) {
  const len = iw.join('').length;
  if (!iw.length || len < 5 || len / total < 0.55 || iw.length > aw.length) return false;
  for (let s = 0; s + iw.length <= aw.length; s++) {
    if (iw.every((w, k) => { const a = aw[s + k]; return w === a || (!/\d/.test(a) && lev(w, a) <= tolFor(a.length)); })) return true;
  }
  return false;
}

const RECENT = 'chibouk_culture_seen';
const loadImg = (url, ms = 3500) => new Promise((res) => { const im = new Image(); const t = setTimeout(() => res(false), ms); im.referrerPolicy = 'no-referrer'; im.onload = () => { clearTimeout(t); res(true); }; im.onerror = () => { clearTimeout(t); res(false); }; im.src = url; });

export async function buildCulture(list, n = 10) {
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch {}
  const seenSet = new Set(seen);
  let pool = list.filter((q) => !seenSet.has(q.i));
  if (pool.length < 40) { seen = []; pool = list; }
  const out = [], perCat = {};
  const tryAdd = async (q) => {
    if ((perCat[q.cat] || 0) >= 2 || out.includes(q)) return false;
    if (q.need && !(await loadImg(q.img))) return false; // question qui n'a pas de sens sans son image : on en prend une autre
    out.push(q); perCat[q.cat] = (perCat[q.cat] || 0) + 1; return true;
  };
  for (let guard = 0; out.length < n && guard < 200; guard++) await tryAdd(pool[randInt(pool.length)]);
  try { localStorage.setItem(RECENT, JSON.stringify([...seen, ...out.map((q) => q.i)].slice(-900))); } catch {}
  return out.map((q) => ({
    type: 'text', label: q.cat, big: q.q, img: q.img, alt: 'Illustration de la question',
    placeholder: 'Ta réponse…', accept: q.a, match: (x) => cultureMatch(x, q.a),
    reveal: q.an ? `<p class="cg-anec">${esc(q.an)}</p>` : '',
  }));
}

export function mount(view, ctx) {
  return mountMCQ(view, ctx, {
    kind: 'culture',
    title: 'Culture <span>G</span>',
    introTitle: () => '10 questions de culture générale, réponse à écrire',
    introText: `${CULTURE_COUNT} questions sur ${CG_CATS.length} thèmes (cinéma, histoire, sciences, sport, jeux vidéo, manga…). Écris ta réponse (3 essais par question) : les accents, les articles, les petites fautes de frappe et les réponses un peu incomplètes sont tolérés.`,
    seconds: 20,
    tries: 3,
    modes: [{ key: 'expert', label: 'Expert', desc: 'Aucune proposition : écris la réponse. 3 essais par question.', seconds: 20, perCorrect: 40, perfectBonus: 300, stat: 'Expert' }],
    load: async () => QUESTIONS,
    build: (data, n) => buildCulture(data, n),
  });
}
