// Défis à relever sur la page d'un jeu : défi de la jungle (s'il porte sur ce jeu), quêtes du jour liées au jeu,
// et succès du jeu pas encore débloqués (avec leur progression). Affiché à côté des machines, sous les mini-jeux.
import { ACHIEVEMENTS, TIERS } from './achievements.js';
import { today, questText, questReward, questMult } from './progress.js';
import { $, fmt, esc } from './ui.js';
import { icon } from './art.js';
import { recordLineHTML, onRecords } from './records.js';

// succès des mini-jeux (catégorie « free ») : préfixe de leur identifiant
const FREE_PREFIX = { quiz: 'qz-', capitals: 'cap-', movies: 'mv-', flags: 'fl-', motus: 'mo-', higher: 'hi-', queens: 'qn-', tango: 'tg-', pinpoint: 'pp-', sudoku: 'sd-', demineur: 'ms-', snake: 'sn-', breaker: 'bk-', memory: 'mm-', crossword: 'cw-', geo: 'geo-', culture: 'cg-', typing: 'ty-' };
export const achsOf = (game) => ACHIEVEMENTS.filter((a) => a.cat === game || (a.cat === 'free' && FREE_PREFIX[game] && a.id.startsWith(FREE_PREFIX[game])));
const questGame = (q) => { const id = q.id || ''; const m = id.match(/^(?:play|win|quiz7)-(.+)$/); return m ? m[1] : id.replace(/\d+$/, ''); };
const mmss = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export function mountGoals(box, game, { wallet, challenges }) {
  if (!box) return () => {};
  let open = false;
  try { open = localStorage.getItem('chibouk_goals_open') === '1'; } catch {}
  function html() {
    const items = [];
    const ch = challenges && challenges.state;
    if (ch && ch.c && ch.c.game === game && !ch.claimed && !ch.full) {
      items.push(`<li class="gl-ch"><span class="gl-ic">${icon('flag')}</span><div><b>Défi de la jungle</b><small>${esc(ch.c.text)}${ch.c.n > 1 ? ` · ${ch.p} / ${ch.c.n}` : ''}</small></div><span class="gl-r">+${fmt(ch.prizes ? ch.prizes[(ch.next || 1) - 1] : ch.prize)}<small class="gl-t" data-end="${ch.end}">${mmss(ch.end - Date.now())}</small></span></li>`);
    }
    const d = today(wallet), qm = questMult(wallet);
    d.quests.filter((q) => !q.done && questGame(q) === game).forEach((q) => items.push(`<li class="gl-q"><span class="gl-ic">${icon('check')}</span><div><b>Quête du jour</b><small>${esc(questText(q))} · ${fmt(q.p)} / ${fmt(q.n)}</small><div class="q-bar"><i style="width:${Math.min(100, (q.p / q.n) * 100)}%"></i></div></div><span class="gl-r">+${fmt(Math.round(questReward(q) * qm))}</span></li>`));
    const u = (wallet.p.ach && wallet.p.ach.u) || {}, c = (wallet.p.ach && wallet.p.ach.c) || {};
    const todo = achsOf(game).filter((a) => !u[a.id]).map((a) => { let pr = null; if (a.progress) { try { const [x, y] = a.progress(wallet, c); pr = [x, y]; } catch {} } return { a, pr, k: pr ? Math.min(1, pr[0] / pr[1]) : 0 }; })
      .sort((x, y) => y.k - x.k || TIERS[x.a.tier].reward - TIERS[y.a.tier].reward);
    const all = achsOf(game).length;
    const shown = open ? todo : todo.slice(0, 3);
    shown.forEach(({ a, pr }) => items.push(`<li class="gl-a t-${a.tier}"><span class="gl-ic">${icon('medal')}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}${pr ? ` · ${fmt(Math.min(pr[0], pr[1]))} / ${fmt(pr[1])}` : ''}</small>${pr ? `<div class="q-bar"><i style="width:${Math.min(100, (pr[0] / pr[1]) * 100)}%"></i></div>` : ''}</div><span class="gl-r">+${fmt(TIERS[a.tier].reward)}</span></li>`));
    const rec = recordLineHTML(game, wallet); // record du jeu (détenteur, et ton meilleur résultat)
    if (!items.length) return all ? `<div class="gl-head">${icon('trophy')}<b>Défis de ce jeu</b><small class="muted">${all} / ${all} succès</small></div>${rec}<p class="muted gl-done">Tout est réussi ici, bravo !</p>` : rec;
    return `<div class="gl-head">${icon('trophy')}<b>Défis à relever ici</b>${all ? `<small class="muted">${all - todo.length} / ${all} succès</small>` : ''}</div>${rec}
      <ul class="gl-list">${items.join('')}</ul>${todo.length > 3 ? `<button type="button" class="gl-more" data-glmore>${open ? 'Voir moins' : `Voir les ${todo.length} succès restants`}</button>` : ''}`;
  }
  let pending = false;
  const render = () => {
    pending = false;
    const h = html();
    box.hidden = !h;
    box.innerHTML = h;
    const m = $('[data-glmore]', box);
    if (m) m.onclick = () => { open = !open; try { localStorage.setItem('chibouk_goals_open', open ? '1' : '0'); } catch {} render(); };
  };
  const later = () => { if (!pending) { pending = true; setTimeout(render, 800); } }; // pas de rendu à chaque partie en turbo
  const off = wallet.on((e) => { if (e && e.type !== 'bet') later(); });
  const offCh = challenges ? challenges.subscribe(later) : () => {};
  const offRec = onRecords(later);
  const iv = setInterval(() => { box.querySelectorAll('[data-end]').forEach((x) => (x.textContent = mmss(+x.dataset.end - Date.now()))); }, 1000);
  render();
  return () => { off(); offCh(); offRec(); clearInterval(iv); };
}
