// Page « Caisses » : ouverture façon case opening (bande d'objets qui défile et ralentit sous un repère).
import { $, $$, fmt, money, esc, toast, modal, coinRain, CUR } from './ui.js';
import { icon, coinSVG } from './art.js';
import { sfx } from './sfx.js';
import * as L from './loot.js';
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
    const p = wallet.p, boosts = L.activeBoosts(p), fb = p.farm && p.farm.xb && p.farm.xb.u > Date.now() ? p.farm.xb : null;
    $('#cs-kpis', view).innerHTML = `
      <div><span>Ton solde</span><b>${money(wallet.shownBalance)}</b></div>
      <div><span>Caisses ouvertes</span><b>${fmt(wallet.stats.casesOpened || 0)}</b></div>
      <div><span>Bonus permanents</span><b class="gold">+${(permBonus(p) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</b><small>gains gratuits ${xMult(freeMult(wallet))} au total${p.farm && p.farm.spd ? ` · chantiers de la ferme −${Math.round(p.farm.spd * 100)} %` : ''}</small></div>
      <div class="cs-boosts"><span>Boosts et tickets</span>${tickets(p)}${boosts.length || fb ? `<ul>${boosts.map((b) => `<li><b>${xMult(b.m)}</b> ${b.g === 'all' ? 'tous les mini-jeux' : esc(L.BOOST_GAMES[b.g] ? L.BOOST_GAMES[b.g][0] : b.g)} <small data-u="${b.u}">${left(b.u - Date.now())}</small></li>`).join('')}${fb ? `<li><b>${xMult(fb.m)}</b> production de la ferme <small data-u="${fb.u}">${left(fb.u - Date.now())}</small></li>` : ''}</ul>` : (tickets(p) ? '' : '<small class="muted">Aucun pour l\'instant</small>')}</div>`;
  }
  // tickets à gratter gagnés (utilisables dans les jeux à gratter)
  function tickets(p) {
    const tk = (p.loot && p.loot.tk) || {}, list = Object.entries(tk).filter(([, n]) => n > 0);
    return list.length ? `<a class="cs-tk" href="#/scratch">${icon('scratch')}${list.map(([t, n]) => `<b>${n}</b> ${esc(L.TICKETS[t][0])}`).join(' · ')}</a>` : '';
  }
  function cases() {
    const card = (c) => `<button type="button" class="cs-case ${c.id === cur.id ? 'on' : ''}" data-c="${c.id}" style="--hue:${c.hue}">
      ${crateSVG(c.hue)}<b>${esc(c.name)}</b><span class="cs-price">${money(c.price)}</span><small class="muted">${esc(c.desc)}</small></button>`;
    $('#cs-cases', view).innerHTML = `<h3 class="cs-grp">Caisses classiques</h3><div class="cs-row">${L.CASES.filter((c) => c.theme === 'std').map(card).join('')}</div>
      <h3 class="cs-grp">Caisses à thème</h3><div class="cs-row">${L.CASES.filter((c) => c.theme !== 'std').map(card).join('')}</div>`;
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
    const list = [...L.poolOf(cur)].sort((a, b) => L.R_ORDER.indexOf(b.r) - L.R_ORDER.indexOf(a.r) || (b.x || 0) - (a.x || 0));
    const v = Math.round((L.valueOf(cur) / cur.price) * 100);
    $('#cs-val', view).textContent = cur.theme === 'cos' ? `Que des cosmétiques exclusifs (avec leurs bonus) ; un cosmétique déjà possédé est remboursé en ${CUR}.`
      : cur.theme === 'farm' ? `Tout pour ta ferme : graines d'or, vitesse de construction permanente, boosts de récolte.`
        : `En moyenne ${v} % du prix revient en ${CUR}${cur.theme === 'risk' ? ' (mais la plupart du temps, beaucoup moins : c\'est le gros lot qui fait la moyenne)' : ' (tickets à gratter compris), plus les boosts et bonus permanents'}.`;
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
      <li>Chaque caisse contient un lot tiré au sort : la bande défile et s'arrête sur ton lot. Les chances de chaque lot sont affichées dans « Contenu de la caisse ».</li>
      <li><b>Raretés</b> : Commun (79,9 %), Rare (16 %), Épique (3,2 %), Légendaire (0,64 %), Mythique (0,26 %).</li>
      <li><b>Caisses classiques</b> : Brundles (de 0,3 à 60 fois le prix), tickets à gratter, boosts de tous les mini-jeux (6 h ou 24 h), boosts de récolte. Plus la caisse est chère, plus elle rend en moyenne : de ${pv(L.CASES[0])} % à ${pv(L.CASES.filter((c) => c.theme === 'std').at(-1))} % du prix.</li>
      <li>Deux boosts identiques s'additionnent en durée.</li>
      <li><b>Bonus permanent</b> (mythique des caisses classiques) : +0,5 à +5 % selon la caisse, sur tous les gains gratuits, pour toujours (roue du jour, quêtes, mini-jeux, défis…), sans plafond.</li>
      <li><b>Tickets à gratter</b> : à utiliser dans les jeux à gratter (bouton « Ticket gratuit »).</li>
      <li><b>Caisses à thème</b> : Cosmétique (que des cosmétiques exclusifs, avec leurs bonus), Va-tout (souvent presque rien, parfois énorme), Fermier (graines d'or, vitesse de construction permanente, boosts de récolte).</li>
      <li><b>Cosmétiques exclusifs</b> : cadres, titres, dos de cartes, thème et effets introuvables en boutique. Un cosmétique déjà possédé est remboursé en Brundles.</li>
      <li>Le lot est enregistré dès le clic : quitter la page pendant l'animation ne fait rien perdre.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  }

  kpis(); cases(); opener(); pool(); history();
  const iv = setInterval(() => { $$('#cs-kpis [data-u]', view).forEach((s) => { s.textContent = left(+s.dataset.u - Date.now()); }); }, 30000);
  const off = wallet.on((e) => { if (!busy && e && e.type !== 'loot') { kpis(); const go = $('#cs-go', view); if (go) go.disabled = !wallet.canAfford(cur.price * count); } });
  const onResize = () => { if (!busy) $$('.cs-track', view).forEach((t) => { if (!t.parentElement.classList.contains('done')) { t.style.transition = 'none'; t.style.transform = `translateX(${-centerOf(t, 6)}px)`; } }); };
  window.addEventListener('resize', onResize);
  return () => { alive = false; clearInterval(iv); off(); window.removeEventListener('resize', onResize); };
}
