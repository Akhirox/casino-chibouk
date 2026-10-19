// Page « Caisses » : ouverture façon case opening (bande d'objets qui défile et ralentit sous un repère).
import { $, $$, fmt, money, esc, toast, modal, coinRain, CUR } from './ui.js';
import { icon, coinSVG } from './art.js';
import { sfx } from './sfx.js';
import * as L from './loot.js';
import * as F from './farm-core.js';
import { applyCosmetics } from './shop.js';
import { permBonus, xMult, freeMult } from './progress.js';

const W_INDEX = 48, STRIP = 56; // position du lot gagnant dans la bande, longueur de la bande
const HIST_KEY = 'chibouk_cases_hist';

export function crateSVG(hue = '#f5c542', cls = '') {
  const id = 'cr' + Math.random().toString(36).slice(2, 7);
  return `<svg class="crate ${cls}" viewBox="0 0 120 100" aria-hidden="true"><defs>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hue}"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="60" cy="93" rx="46" ry="6" fill="#000" opacity=".35"/>
    <rect x="12" y="34" width="96" height="56" rx="7" fill="${hue}"/><rect x="12" y="34" width="96" height="56" rx="7" fill="url(#${id}a)"/>
    <rect x="8" y="22" width="104" height="18" rx="5" fill="${hue}"/><rect x="8" y="22" width="104" height="18" rx="5" fill="url(#${id}b)"/>
    <path d="M8 31h104" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
    <rect x="22" y="40" width="8" height="46" rx="2" fill="#000" opacity=".22"/><rect x="90" y="40" width="8" height="46" rx="2" fill="#000" opacity=".22"/>
    <rect x="48" y="18" width="24" height="26" rx="4" fill="#2b2b2b" stroke="#000" stroke-opacity=".4"/><circle cx="60" cy="30" r="5" fill="${hue}"/><rect x="58.5" y="30" width="3" height="7" rx="1" fill="${hue}"/>
    <circle cx="60" cy="64" r="15" fill="#000" opacity=".25"/><text x="60" y="71" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" opacity=".9" font-family="system-ui">?</text>
    <g fill="#fff" opacity=".55"><circle cx="17" cy="39" r="1.6"/><circle cx="103" cy="39" r="1.6"/><circle cx="17" cy="85" r="1.6"/><circle cx="103" cy="85" r="1.6"/></g></svg>`;
}

function itemIcon(name) { return name === 'coin' ? coinSVG('coin') : icon(name); }
export function tileHTML(d, attrs = '') {
  const lb = L.labelOf(d);
  return `<div class="cs-it r-${d.r}" ${attrs}><div class="cs-it-ic">${itemIcon(lb.icon)}</div><b>${esc(lb.title)}</b><small>${esc(lb.sub)}</small><i class="cs-bar"></i></div>`;
}
const pctTxt = (p) => (p * 100 >= 1 ? (p * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : (p * 100).toLocaleString('fr-FR', { maximumSignificantDigits: 2 })) + ' %';
const pc = (x) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';
const left = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };

export function mount(view, { wallet, social }) {
  let alive = true, cur = L.CASES[0], count = 1, busy = false, quick = false;
  try { cur = L.caseById(localStorage.getItem('chibouk_case')) || cur; quick = localStorage.getItem('chibouk_case_quick') === '1'; } catch {}
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(HIST_KEY + wallet.uid) || '[]'); } catch {}

  view.innerHTML = `<div class="cs-wrap">
    <div class="game-head"><h1>Cai<span>sses</span></h1><div class="actions"><button class="btn btn-ghost btn-sm" id="cs-help">Comment ça marche ?</button></div></div>
    <section class="cs-kpis" id="cs-kpis"></section>
    <section class="cs-cases" id="cs-cases"></section>
    <section class="cs-open panel" id="cs-open"></section>
    <section class="panel"><h2 class="cs-h2">${icon('crate')}<span>Contenu de la caisse</span><small class="muted" id="cs-val"></small></h2><div class="cs-pool" id="cs-pool"></div></section>
    <section class="panel"><h2 class="cs-h2">${icon('scroll')}<span>Mes derniers lots</span></h2><div class="cs-hist" id="cs-hist"></div></section></div>`;
  $('#cs-help', view).onclick = help;

  function kpis() {
    const p = wallet.p, now = Date.now(), fbs = p.farm ? F.activeFarmBoosts(p.farm, now) : [], fb = fbs.length ? { m: F.boostAt(p.farm, now), u: F.boostEnd(p.farm, now), n: fbs.length } : null;
    const boosts = L.activeBoosts(p, now), by = (g) => boosts.filter((b) => b.g === g);
    const stackLine = (g, label) => { const list = by(g); if (!list.length) return ''; const m = g === 'all' ? L.boostMult(p, 'all') : g === 'chal' ? L.chalBoost(p) : L.sellBoost(p); const end = Math.max(...list.map((b) => b.u)); return `<li title="${list.map((b) => `×${String(b.m).replace('.', ',')} encore ${left(b.u - now)}`).join(' · ')}"><b>${xMult(m)}</b> ${label}${list.length > 1 ? ` <small>(${list.length} boosts empilés)</small>` : ''} <small data-u="${end}">${left(end - now)}</small></li>`; };
    const perms = [
      permBonus(p) ? `gains gratuits +${pc(permBonus(p))}` : '',
      L.lootPerm(p, 'vault') ? `coffre +${pc(L.lootPerm(p, 'vault'))} (${pc(wallet.vaultRate)}/jour)` : '',
      L.lootPerm(p, 'wheel') ? `roue du jour +${pc(L.lootPerm(p, 'wheel'))}` : '',
      L.lootPerm(p, 'chalp') ? `défis +${pc(L.lootPerm(p, 'chalp'))}` : '',
      L.lootPerm(p, 'sell') ? `bananes +${pc(L.lootPerm(p, 'sell'))}` : '',
      p.farm && p.farm.seeds ? `${p.farm.seeds} graine${p.farm.seeds > 1 ? 's' : ''} d'or` : '',
      p.farm && p.farm.spd ? `chantiers −${pc(p.farm.spd)}` : '',
    ].filter(Boolean);
    const lines = [stackLine('all', 'tous les mini-jeux'), stackLine('chal', 'récompenses des défis'), stackLine('sell', 'vente des bananes'),
      fb ? `<li title="${fbs.map((b) => `×${String(b.m).replace('.', ',')} encore ${left(b.u - now)}`).join(' · ')}"><b>${xMult(fb.m)}</b> récolte de la ferme${fb.n > 1 ? ` <small>(${fb.n} boosts empilés)</small>` : ''} <small data-u="${fb.u}">${left(fb.u - now)}</small></li>` : '',
      ...boosts.filter((b) => L.BOOST_GAMES[b.g]).map((b) => `<li><b>${xMult(b.m)}</b> ${esc(L.BOOST_GAMES[b.g][0])} <small data-u="${b.u}">${left(b.u - now)}</small></li>`),
      p.loot && p.loot.spins ? `<li><b>${p.loot.spins}</b> tour${p.loot.spins > 1 ? 's' : ''} de roue bonus</li>` : ''].filter(Boolean);
    $('#cs-kpis', view).innerHTML = `
      <div><span>Ton solde</span><b>${money(wallet.shownBalance)}</b></div>
      <div><span>Caisses ouvertes</span><b>${fmt(wallet.stats.casesOpened || 0)}</b></div>
      <div><span>Bonus permanents</span>${perms.length ? `<small class="cs-perms">${perms.join(' · ')}</small>` : '<small class="muted">Aucun pour l\'instant (coffres royaux)</small>'}</div>
      <div class="cs-boosts"><span>Boosts en cours</span>${tickets(p)}${lines.length ? `<ul>${lines.join('')}</ul>` : (tickets(p) ? '' : '<small class="muted">Aucun pour l\'instant</small>')}</div>`;
  }
  // tickets à gratter gagnés (utilisables dans les jeux à gratter)
  function tickets(p) {
    const tk = (p.loot && p.loot.tk) || {}, list = Object.entries(tk).filter(([, n]) => n > 0);
    return list.length ? `<a class="cs-tk" href="#/scratch">${icon('scratch')}${list.map(([t, n]) => `<b>${n}</b> ${esc(L.TICKETS[t][0])}`).join(' · ')}</a>` : '';
  }
  let fam = cur.fam;
  // couleur, icône et accroche de chaque famille (onglets bien visibles)
  const FAM_STYLE = {
    farm: { c: '#7fd14f', c2: '#2f7a1c', ic: 'banana', tag: 'ferme' },
    mini: { c: '#36c2ff', c2: '#1060b8', ic: 'gift', tag: 'mini-jeux & défis' },
    cos: { c: '#ff7ab6', c2: '#a8235f', ic: 'shop', tag: 'cosmétiques' },
    br: { c: '#ff8a3d', c2: '#b8320f', ic: 'bolt', tag: 'gros risque' },
    royal: { c: '#f5c542', c2: '#9a6a00', ic: 'star', tag: 'bonus permanents' },
  };
  function cases() {
    const card = (c) => `<button type="button" class="cs-case ${c.id === cur.id ? 'on' : ''}" data-c="${c.id}" style="--hue:${c.hue}">
      ${crateSVG(c.hue)}<b>${esc(c.name)}</b><span class="cs-price">${money(c.price)}</span><small class="muted">${esc(c.desc)}</small></button>`;
    const f = L.FAMILIES.find((x) => x[0] === fam) || L.FAMILIES[0];
    $('#cs-cases', view).innerHTML = `<div class="cs-fams">${L.FAMILIES.map(([k, n]) => { const st = FAM_STYLE[k] || {}; const nb = L.CASES.filter((c) => c.fam === k).length;
      return `<button type="button" data-fam="${k}" class="cs-fam ${k === fam ? 'on' : ''}" style="--fc:${st.c};--fc2:${st.c2}"><span class="cs-fam-ic">${icon(st.ic || 'crate')}</span><span class="cs-fam-t"><b>${n}</b><small>${nb} ${k === 'cos' ? 'coffrets' : k === 'royal' ? 'coffres' : 'caisses'} · ${st.tag || ''}</small></span></button>`; }).join('')}</div>
      <p class="cs-famdesc" style="--fc:${(FAM_STYLE[fam] || {}).c}">${esc(f[2])}</p>
      <div class="cs-row">${L.CASES.filter((c) => c.fam === fam).map(card).join('')}</div>`;
    $$('[data-fam]', view).forEach((b) => (b.onclick = () => { if (busy) return; fam = b.dataset.fam; sfx.click(); const first = L.CASES.find((c) => c.fam === fam); if (cur.fam !== fam && first) { cur = first; opener(); pool(); } cases(); }));
    $$('[data-c]', view).forEach((b) => (b.onclick = () => { if (busy) return; cur = L.caseById(b.dataset.c); try { localStorage.setItem('chibouk_case', cur.id); } catch {} sfx.click(); cases(); opener(); pool(); }));
  }
  function opener() {
    const total = cur.price * count;
    $('#cs-open', view).innerHTML = `<div class="cs-head" style="--hue:${cur.hue}">${crateSVG(cur.hue, 'sm')}<div><h2>${esc(cur.name)}</h2><small class="muted">${money(cur.price)} la caisse</small></div>
        <div class="cs-ctrl"><span class="seg cs-n">${[1, 3, 5].map((n) => `<button type="button" data-n="${n}" class="${n === count ? 'on' : ''}">×${n}</button>`).join('')}</span>
        <label class="cs-quick"><input type="checkbox" id="cs-quick" ${quick ? 'checked' : ''}> Ouverture rapide</label>
        <button class="btn btn-gold btn-lg" id="cs-go" ${wallet.canAfford(total) && !busy ? '' : 'disabled'}>Ouvrir${count > 1 ? ` ×${count}` : ''} · ${fmt(total)} ${CUR}</button></div></div>
      <div class="cs-reels" id="cs-reels">${Array.from({ length: count }, () => reelHTML(idleStrip())).join('')}</div>
      <div class="cs-result" id="cs-result"></div>`;
    $$('.cs-n [data-n]', view).forEach((b) => (b.onclick = () => { if (busy) return; count = +b.dataset.n; sfx.click(); opener(); }));
    $('#cs-quick', view).onchange = (e) => { quick = e.target.checked; try { localStorage.setItem('chibouk_case_quick', quick ? '1' : '0'); } catch {} };
    $('#cs-go', view).onclick = open;
    $$('.cs-track', view).forEach((t) => { t.style.transform = `translateX(${-centerOf(t, 6)}px)`; });
  }
  const idleStrip = () => Array.from({ length: 14 }, () => L.draw(cur));
  const reelHTML = (items) => `<div class="cs-reel"><div class="cs-track">${items.map((d, i) => tileHTML(d, `data-i="${i}"`)).join('')}</div><i class="cs-mark"></i></div>`;
  // décalage pour centrer l'objet n° i sous le repère
  function centerOf(track, i, jitter = 0) {
    const el = track.children[i], reel = track.parentElement;
    if (!el || !reel) return 0;
    return el.offsetLeft + el.offsetWidth / 2 + jitter - reel.clientWidth / 2;
  }
  function pool() {
    const list = [...L.poolOf(cur)].sort((a, b) => L.R_ORDER.indexOf(b.r) - L.R_ORDER.indexOf(a.r) || L.chanceOf(cur, a) - L.chanceOf(cur, b));
    const v = Math.round((L.valueOf(cur) / cur.price) * 100);
    $('#cs-val', view).textContent = cur.fam === 'cos' ? `En moyenne, un tirage vaut ${v} % du prix du coffret en valeur boutique. Un objet déjà possédé est remboursé à sa valeur boutique.`
      : cur.fam === 'royal' ? 'Toujours un bonus permanent : plus le coffre est cher, plus il est gros. Un bonus déjà au maximum est remplacé par des gains gratuits en plus.'
        : cur.fam === 'br' ? `En moyenne ${v} % du prix revient en ${CUR}${cur.id === 'qod' ? '' : ' (la plupart du temps beaucoup moins : c\'est le gros lot qui fait la moyenne)'}.`
          : `${v} % du prix revient en ${CUR} en moyenne ; le reste de la valeur est dans les boosts (${cur.fam === 'mini' ? 'empilables' : 'ferme, cumulables'}).`;
    $('#cs-pool', view).innerHTML = list.map((it) => { const lb = L.poolLabel(cur, it); return `<div class="cs-it r-${it.r} cs-pool-it"><div class="cs-it-ic">${itemIcon(lb.icon)}</div><b>${esc(lb.title)}</b><small>${esc(lb.sub)}</small><span class="cs-ch">${L.RARITIES[it.r].name} · ${pctTxt(L.chanceOf(cur, it))}</span><i class="cs-bar"></i></div>`; }).join('');
  }
  function history() {
    const el = $('#cs-hist', view);
    if (!el) return;
    el.innerHTML = hist.length ? hist.slice(0, 18).map((d) => tileHTML(d, `title="${esc(L.caseById(d.c) ? L.caseById(d.c).name : '')}"`)).join('') : '<p class="muted">Tu n\'as encore ouvert aucune caisse.</p>';
  }

  async function open() {
    if (busy || !alive) return;
    const c = cur, n = count, total = c.price * n;
    if (!wallet.canAfford(total)) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    busy = true;
    wallet.debit('loot', total, { case: c.id, n });
    // tirage et gains appliqués tout de suite (rien n'est perdu si on quitte la page), mais révélés après l'animation
    const drops = [];
    const reveal = wallet.deferEvents(() => { for (let i = 0; i < n; i++) { const d = L.draw(c, wallet.p); L.applyDrop(wallet, c, d); drops.push(d); } });
    opener();
    $('#cs-go', view).disabled = true;
    const tracks = $$('.cs-track', view);
    tracks.forEach((t, k) => {
      const items = Array.from({ length: STRIP }, () => L.draw(c));
      items[W_INDEX] = drops[k];
      if (Math.random() < 0.35) items[W_INDEX + 1] = L.drawTier(c, Math.random() < 0.3 ? 'red' : 'pink'); // le gros lot juste à côté : suspense
      t.innerHTML = items.map((d, i) => tileHTML(d, `data-i="${i}"`)).join('');
      t.style.transition = 'none';
      t.style.transform = `translateX(${-centerOf(t, 4)}px)`;
    });
    const dur = quick ? 1500 : 5600;
    void view.offsetWidth;
    let lastIdx = -1, raf = 0;
    const step = () => {
      const t = tracks[0]; if (!t || !alive) return;
      const x = -new DOMMatrixReadOnly(getComputedStyle(t).transform).m41;
      const first = t.children[0], w = first ? first.offsetWidth + 8 : 128;
      const idx = Math.floor((x + t.parentElement.clientWidth / 2) / w);
      if (idx !== lastIdx) { lastIdx = idx; sfx.tick(); }
      raf = requestAnimationFrame(step);
    };
    tracks.forEach((t) => {
      const w = t.children[W_INDEX].offsetWidth;
      t.style.transition = `transform ${dur}ms cubic-bezier(.08,.6,.14,1)`;
      t.style.transform = `translateX(${-centerOf(t, W_INDEX, (Math.random() - 0.5) * w * 0.8)}px)`;
    });
    raf = requestAnimationFrame(step);
    await new Promise((r) => setTimeout(r, dur + 120));
    cancelAnimationFrame(raf);
    if (!alive) { reveal(); return; }
    tracks.forEach((t) => { t.children[W_INDEX].classList.add('win'); t.parentElement.classList.add('done'); });
    reveal();
    finish(c, drops);
    busy = false;
    const go = $('#cs-go', view); if (go) go.disabled = !wallet.canAfford(cur.price * count);
  }

  function finish(c, drops) {
    const best = drops.reduce((a, d) => (L.R_ORDER.indexOf(d.r) > L.R_ORDER.indexOf(a.r) ? d : a), drops[0]);
    const br = drops.reduce((a, d) => a + (d.kind === 'br' || d.dup ? d.amount : 0), 0);
    const bi = L.R_ORDER.indexOf(best.r);
    if (bi >= 3) { sfx.bonus(); coinRain(bi === 4 ? 90 : 50); } else if (bi === 2) { sfx.win(true); coinRain(20); } else if (br >= c.price * count) sfx.win(false); else sfx.coin();
    if (drops.some((d) => d.kind === 'cos' && !d.dup)) applyCosmetics(wallet);
    $('#cs-result', view).innerHTML = `<div class="cs-res-row">${drops.map((d) => tileHTML(d)).join('')}</div>
      <p class="cs-res-sum">${br ? `+${money(br)}` : ''}${br && drops.length > 1 ? ' au total' : ''}${drops.some((d) => d.kind === 'cos' && !d.dup) ? ' · nouveau cosmétique : équipe-le dans la <a href="#/shop">boutique</a>' : ''}${drops.some((d) => d.kind === 'boost') ? ' · boost activé tout de suite' : ''}</p>`;
    drops.forEach((d) => {
      hist.unshift({ ...d, c: c.id });
      if (social && L.R_ORDER.indexOf(d.r) >= 3) social.post({ kind: 'loot', r: d.r, txt: L.labelOf(d).title.slice(0, 60), sub: L.labelOf(d).sub.slice(0, 60), box: c.name });
    });
    hist = hist.slice(0, 30);
    try { localStorage.setItem(HIST_KEY + wallet.uid, JSON.stringify(hist)); } catch {}
    history(); kpis();
  }

  const pv = (c) => Math.round((L.valueOf(c) / c.price) * 100);
  function help() {
    modal({ title: 'Les caisses', cls: 'wide', html: `<ul class="muted fm-help">
      <li>Chaque caisse contient un lot tiré au sort : la bande défile et s'arrête sur ton lot. Les chances exactes sont dans « Contenu de la caisse ».</li>
      <li><b>Raretés</b> : Commun 70 %, Rare 22 %, Épique 6 %, Légendaire 1,7 %, Mythique 0,3 % (sauf coffrets cosmétiques et quitte ou double).</li>
      ${L.FAMILIES.map(([, n, d]) => `<li><b>${n}</b> : ${d}</li>`).join('')}
      <li><b>Boosts empilables</b> (mini-jeux, défis, vente des bananes) : le plus fort compte en entier, le 2e aux 3/4, le 3e au quart, puis de moins en moins. Deux ×3 = ×4,5, trois ×3 = ×5. Plafonds : ×6 pour les mini-jeux, ×3 pour les défis et la vente.</li>
      <li><b>Récolte de la ferme</b> : les boosts se cumulent aussi, mais très peu : le 2e compte à moitié, le 3e au quart, le 4e au huitième… jusqu'à ×5 au maximum (deux ×2 = ×2,5 ; il faut beaucoup de ×3 pour approcher ×5).</li>
      <li><b>Plafonds des bonus permanents</b> : coffre +100 %, vente des bananes +100 %, roue du jour +300 %, défis +200 %, vitesse de construction −60 % ; gains gratuits sans plafond.</li>
      <li>Aucune caisse ne donne de rakeback : impossible de miser à l'infini en se faisant rembourser.</li>
      <li>Le lot est enregistré dès le clic : quitter la page pendant l'animation ne fait rien perdre.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  }

  kpis(); cases(); opener(); pool(); history();
  const iv = setInterval(() => { $$('#cs-kpis [data-u]', view).forEach((s) => { s.textContent = left(+s.dataset.u - Date.now()); }); }, 30000);
  const off = wallet.on((e) => { if (!busy && e && e.type !== 'loot') { kpis(); const go = $('#cs-go', view); if (go) go.disabled = !wallet.canAfford(cur.price * count); } });
  const onResize = () => { if (!busy) $$('.cs-track', view).forEach((t) => { if (!t.parentElement.classList.contains('done')) { t.style.transition = 'none'; t.style.transform = `translateX(${-centerOf(t, 6)}px)`; } }); };
  window.addEventListener('resize', onResize);
  return () => { alive = false; clearInterval(iv); off(); window.removeEventListener('resize', onResize); };
}
