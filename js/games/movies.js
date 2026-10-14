// Quiz ciné — jeu gratuit : réalisateurs, années, castings (800 films les plus votés de la base TMDB)
import { CONFIG } from '../config.js';
import { randInt } from './slots-math.js';
import { esc } from '../ui.js';
import { mountMCQ, makeQ, pickDistinct, pick, shuffle } from './mcq.js';

let cache = null;
// data/movies.json : [titre, année, [réalisateurs], [acteurs], affiche]
export async function loadMovies() {
  if (cache) return cache;
  const res = await fetch('data/movies.json', { cache: 'force-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  cache = (await res.json()).map(([t, y, d, a, p]) => ({ t, y, d, a, p }));
  return cache;
}

const label = (m) => `${m.t} (${m.y})`;
const MAX_YEAR = 2017;

function reveal(m) {
  return `<div class="mv-reveal">${m.p ? `<img src="https://image.tmdb.org/t/p/w154${m.p}" alt="" loading="lazy">` : ''}
    <div><b>${esc(m.t)}</b> <span class="muted">(${m.y})</span><br><small>Réalisé par ${esc(m.d.join(' et '))}<br>Avec ${esc(m.a.slice(0, 3).join(', '))}</small></div></div>`;
}

// Leurres pris de préférence parmi les films de la même époque
function sameEra(all, m, span = 12) { return all.filter((x) => x !== m && Math.abs(x.y - m.y) <= span); }
function decoys(all, m, n, map, ok) {
  const taken = new Set();
  const out = [];
  const known = all.slice(0, 400); // leurres connus de préférence
  for (const src of [sameEra(known, m), known, all]) {
    const vals = [...new Set(src.flatMap(map))];
    out.push(...pickDistinct(vals, n - out.length, (v) => ok(v) && !out.includes(v), taken));
    if (out.length >= n) break;
  }
  return out;
}

const TYPES = {
  director: (all, m) => makeQ({ label: 'Qui a réalisé ce film ?', big: label(m), right: m.d[0],
    wrong: decoys(all, m, 3, (x) => x.d, (v) => !m.d.includes(v)), reveal: reveal(m) }),
  actor: (all, m) => makeQ({ label: 'Qui joue dans ce film ?', big: label(m), right: pick(m.a.slice(0, 3)),
    wrong: decoys(all, m, 3, (x) => x.a.slice(0, 3), (v) => !m.a.includes(v)), reveal: reveal(m) }),
  year: (all, m) => {
    const s = 2 + randInt(3); // écart de 2 à 4 ans entre les propositions
    let k = randInt(4);
    k = Math.max(k, 3 - Math.floor((MAX_YEAR - m.y) / s));
    const years = [0, 1, 2, 3].map((i) => String(m.y + (i - k) * s));
    return { label: 'En quelle année est sorti ce film ?', big: m.t, sub: `réalisé par ${m.d.join(" et ")}`, choices: years, answer: k, reveal: reveal(m) };
  },
  byDirector: (all, m) => makeQ({ label: 'Lequel de ces films a été réalisé par…', big: m.d[0], right: label(m),
    wrong: decoys(all, m, 3, (x) => (x.d.includes(m.d[0]) ? [] : [label(x)]), () => true), reveal: reveal(m) }),
  byCast: (all, m) => {
    const [a, b] = m.a;
    return makeQ({ label: 'Dans quel film jouent ces deux acteurs ?', big: `${a} et ${b}`, right: label(m),
      wrong: decoys(all, m, 3, (x) => (x.a.includes(a) || x.a.includes(b) ? [] : [label(x)]), () => true), reveal: reveal(m) });
  },
};
// on pose surtout « qui a réalisé » et « qui joue dedans », plus accessibles
const MIX = ['director', 'director', 'actor', 'actor', 'byCast', 'byCast', 'year', 'byDirector', 'byDirector', 'actor'];

export function buildMovies(all, n = 10) {
  const kinds = shuffle(MIX).slice(0, n);
  const used = new Set();
  return kinds.map((kind, i) => {
    const top = i < 4 ? 250 : i < 8 ? 500 : all.length; // les films les plus connus d'abord
    const m = pickDistinct(all.slice(0, top), 1, (x) => !used.has(x))[0];
    used.add(m);
    return TYPES[kind](all, m);
  });
}

export function mount(view, ctx) {
  return mountMCQ(view, ctx, {
    kind: 'movies',
    title: 'Quiz <span>ciné</span>',
    introTitle: `${CONFIG.QUIZ_QUESTIONS} questions, ${CONFIG.MOVIES_SECONDS} secondes chacune`,
    introText: 'Réalisateurs, acteurs, années de sortie : 800 films parmi les plus populaires (titres en VO). 4 réponses au choix.',
    seconds: CONFIG.MOVIES_SECONDS,
    load: loadMovies,
    build: buildMovies,
  });
}
