// Ferme à bananes : page, tuiles dessinées, marché, fermes des voisins, et minuterie globale (chantiers, stock plein).
import { cosBonus } from './bonus.js';
import { lootPerm, sellBoost, activeBoosts, stackMult, STACK_CAP, syncLatePerms } from './loot.js';
import { openBoostDetail, boostDetailHTML } from './boostdetail.js';
import { EXPEDITION_ITEMS, owns } from './shop.js';
import * as F from './farm-core.js';
import { $, $$, fmt, money, esc, toast, modal, coinRain, CUR } from './ui.js';
import { icon } from './art.js';
import { sfx } from './sfx.js';
import { getPlayers } from './players.js';
import { avatarHTML } from './profile.js';

/* ------------------------------ outils ------------------------------ */
export const BANANA = '<svg viewBox="0 0 24 24" class="ban" aria-hidden="true"><path d="M4.2 5.6C4.4 12.6 9.6 18.6 16.2 18.6c2.4 0 4.3-.8 5.6-2.2-1.9.3-3.8.2-5.6-.4C11.4 14.4 7.8 10.6 6.8 5.4z" fill="#ffd23f" stroke="#b88600" stroke-width="1" stroke-linejoin="round"/><path d="M6.6 8.6c1.4 4 4.4 7 8.4 8.2" stroke="#e0aa00" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M4.3 5.8 3.6 3.4l2.8-.3.4 2.3z" fill="#7a5a2a"/><path d="M21.8 16.4l.9.6" stroke="#5a3a1a" stroke-width="1.6" stroke-linecap="round"/></svg>';
export const STAR = '<svg viewBox="0 0 24 24" class="seed" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#f5c542" stroke="#b88600" stroke-width="1.2" stroke-linejoin="round"/></svg>';
export const SEED = '<svg viewBox="0 0 24 24" class="seed" aria-hidden="true"><path d="M12 3c4.5 3 6.5 7 6 11-.4 3.6-3 6.5-6 7-3-.5-5.6-3.4-6-7-.5-4 1.5-8 6-11z" fill="#f5c542" stroke="#b88600" stroke-width="1.2"/><path d="M12 7c-1.4 3-1.6 7 0 11" stroke="#fff6" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
export const ban = (n) => `<span class="bn">${fmt(Math.floor(n))}${BANANA}</span>`;
export function dur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return `${d} j ${h % 24} h`;
  if (h) return `${h} h ${String(m % 60).padStart(2, '0')}`;
  return `${m} min${s % 60 && m < 10 ? ` ${s % 60} s` : ''}`;
}
export const hasFarm = (p) => !!(p && p.farm && p.farm.v);
// grands montants : 1,35 Md, 250 M
const fmtBig = (n) => (n >= 1e9 ? `${String(Math.round(n / 1e7) / 100).replace('.', ',')} Md` : n >= 1e6 ? `${String(Math.round(n / 1e4) / 100).replace('.', ',')} M` : fmt(n));
const WONDER_ART = {
  temple: '<svg viewBox="0 0 64 64"><path d="M8 26 32 10l24 16z" fill="#f5c542" stroke="#8a5a00" stroke-width="2"/><rect x="12" y="26" width="40" height="4" fill="#d9a520"/><g fill="#f0d27a" stroke="#8a5a00" stroke-width="1.5"><rect x="15" y="30" width="5" height="20"/><rect x="25" y="30" width="5" height="20"/><rect x="34" y="30" width="5" height="20"/><rect x="44" y="30" width="5" height="20"/></g><rect x="9" y="50" width="46" height="6" rx="1" fill="#c98a00"/><circle cx="32" cy="20" r="4" fill="#fff6c4"/></svg>',
  port: '<svg viewBox="0 0 64 64"><path d="M4 44c6 4 10 4 14 0 4 4 10 4 14 0 4 4 10 4 14 0 4 4 8 4 14 0v14H4z" fill="#2a6fc4"/><path d="M14 40h36l-6 8H20z" fill="#8a5a2b"/><path d="M31 10v30" stroke="#5a3a1a" stroke-width="2.5"/><path d="M33 12l14 24H33z" fill="#fff"/><path d="M29 16 18 34h11z" fill="#f0e6c8"/><path d="M31 10l8 3-8 3z" fill="#ff4d5e"/></svg>',
  obs: '<svg viewBox="0 0 64 64"><rect x="16" y="34" width="32" height="22" fill="#6b7a8f"/><path d="M14 36a18 18 0 0 1 36 0z" fill="#9fb3c8" stroke="#3a4a5f" stroke-width="2"/><path d="M34 22l14-10" stroke="#3a4a5f" stroke-width="5" stroke-linecap="round"/><circle cx="52" cy="10" r="2" fill="#ffe27a"/><circle cx="44" cy="6" r="1.5" fill="#ffe27a"/><rect x="28" y="44" width="8" height="12" fill="#3a4a5f"/></svg>',
  arbre: '<svg viewBox="0 0 64 64"><path d="M28 58c2-10 2-20 0-30h8c-2 10-2 20 0 30z" fill="#7a4a1f"/><circle cx="32" cy="22" r="16" fill="#2e9e4f"/><circle cx="18" cy="28" r="10" fill="#37b35c"/><circle cx="46" cy="28" r="10" fill="#37b35c"/><circle cx="32" cy="12" r="9" fill="#46c46b"/><g fill="#ffe27a"><circle cx="24" cy="20" r="2"/><circle cx="40" cy="16" r="2"/><circle cx="44" cy="30" r="2"/><circle cx="20" cy="31" r="2"/><circle cx="32" cy="27" r="2"/></g></svg>',
};
// V40 : bâtiments mythiques
const MYTHIC_ART = {
  grenier: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="54" rx="24" ry="5" fill="#9fd3ff55"/><path d="M14 52V26l18-14 18 14v26z" fill="#e8f2ff" stroke="#5a7fb0" stroke-width="2"/><path d="M10 28 32 10l22 18" fill="none" stroke="#f5c542" stroke-width="3" stroke-linecap="round"/><rect x="26" y="36" width="12" height="16" rx="2" fill="#5a7fb0"/><circle cx="32" cy="26" r="4" fill="#f5c542"/><g fill="#fff" opacity=".85"><circle cx="8" cy="14" r="1.5"/><circle cx="56" cy="10" r="1.5"/><circle cx="54" cy="40" r="1.2"/></g><path d="M6 46c4-3 8-3 10 0M48 48c4-3 8-3 10 0" stroke="#cfe6ff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  comptoir: '<svg viewBox="0 0 64 64"><rect x="8" y="34" width="48" height="20" rx="2" fill="#a06a3a" stroke="#6b4320" stroke-width="2"/><path d="M6 22h52l-4 12H10z" fill="#ff4d5e"/><path d="M6 22h52" stroke="#fff" stroke-width="2"/><g fill="#fff"><path d="M14 22l-3 12h6zM30 22l-1 12h6zM46 22l1 12h6z" opacity=".8"/></g><g fill="#ffd23f" stroke="#b88600" stroke-width=".8"><ellipse cx="20" cy="42" rx="3" ry="6" transform="rotate(-20 20 42)"/><ellipse cx="26" cy="42" rx="3" ry="6"/><ellipse cx="32" cy="42" rx="3" ry="6" transform="rotate(20 32 42)"/></g><circle cx="46" cy="44" r="6" fill="#f5c542" stroke="#8a5a00" stroke-width="1.5"/><path d="M46 40v8M44 42h3a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h3" stroke="#8a5a00" stroke-width="1.2" fill="none"/><path d="M30 8v14M24 12h12" stroke="#6b4320" stroke-width="2"/></svg>',
  bourse: '<svg viewBox="0 0 64 64"><path d="M8 24 32 10l24 14z" fill="#c9d3e0" stroke="#4a5568" stroke-width="2"/><rect x="10" y="24" width="44" height="4" fill="#a0aec0"/><g fill="#e2e8f0" stroke="#4a5568" stroke-width="1.2"><rect x="13" y="28" width="5" height="20"/><rect x="23" y="28" width="5" height="20"/><rect x="36" y="28" width="5" height="20"/><rect x="46" y="28" width="5" height="20"/></g><rect x="8" y="48" width="48" height="7" rx="1" fill="#718096"/><path d="M14 44l10-8 8 4 16-14" stroke="#3ddc84" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 24h6v6" stroke="#3ddc84" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  coeur: '<svg viewBox="0 0 64 64"><circle cx="32" cy="30" r="24" fill="#3ddc8430"/><path d="M28 60c2-10 2-18 0-26h8c-2 8-2 16 0 26z" fill="#7a4a1f"/><path d="M32 48C14 36 12 22 22 18c5-2 9 1 10 5 1-4 5-7 10-5 10 4 8 18-10 30z" fill="#ff4d8d" stroke="#a8235f" stroke-width="2"/><path d="M26 26c2-3 5-3 6 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/><g fill="#ffe27a"><circle cx="10" cy="14" r="2"/><circle cx="54" cy="12" r="2"/><circle cx="56" cy="40" r="1.6"/><circle cx="8" cy="42" r="1.6"/></g></svg>',
};
const BUILD_ART = { ...WONDER_ART, ...MYTHIC_ART };
const bDef = (k) => F.WONDERS[k] || F.MYTHIC_B[k];
// Copie à jour d'une ferme (la sienne ou celle d'un voisin) sans toucher à l'original
export function snapshot(raw, now = Date.now()) { const f = F.normalize(JSON.parse(JSON.stringify(raw || {})), now); F.tick(f, now); return f; }
const MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000];

/* ------------------------------ dessins des tuiles ------------------------------ */
function tree(x, y, s, L) {
  const bunch = L >= 8 ? '#ffc400' : '#ffd23f';
  const n = Math.min(4, 1 + Math.floor(L / 3));
  let b = '';
  for (let k = 0; k < n; k++) b += `<ellipse cx="${x - 3 + (k % 2) * 6}" cy="${y + 2 + Math.floor(k / 2) * 5}" rx="3.2" ry="5" fill="${bunch}" stroke="#b88600" stroke-width=".6"/>`;
  return `<g transform="translate(0 0) scale(${s})" transform-origin="${x} ${y + 20}">
    <path d="M${x} ${y + 22} C${x - 1} ${y + 12} ${x + 1} ${y + 6} ${x} ${y - 2}" stroke="#7a5a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M${x} ${y - 2} q-16 -6 -22 6 q12 -3 22 -6z M${x} ${y - 2} q16 -6 22 6 q-12 -3 -22 -6z M${x} ${y - 3} q-8 -14 -20 -10 q12 2 20 10z M${x} ${y - 3} q8 -14 20 -10 q-12 2 -20 10z" fill="#2fa866" stroke="#1d7a47" stroke-width=".8"/>
    ${b}</g>`;
}
export function tileArt(t, L) {
  if (t === 'F') {
    const trees = L >= 9 ? [[30, 44, 0.85], [70, 44, 0.85], [50, 58, 1]] : L >= 4 ? [[34, 50, 0.95], [68, 50, 0.95]] : [[50, 46, 1.3]];
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="84" rx="40" ry="9" fill="#00000030"/><path d="M12 78 h76" stroke="#5a3a1a" stroke-width="2" stroke-dasharray="3 5" opacity=".5"/>${trees.map(([x, y, s]) => tree(x, y, s, L)).join('')}</svg>`;
  }
  if (t === 'C') {
    const big = L >= 5;
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="38" ry="8" fill="#00000030"/>
      <rect x="22" y="${big ? 44 : 50}" width="56" height="${big ? 40 : 34}" rx="3" fill="#a06a3a" stroke="#6b4320" stroke-width="2"/>
      <path d="M22 ${big ? 52 : 58} h56 M22 ${big ? 62 : 68} h56 M22 ${big ? 72 : 78} h56" stroke="#7a4e28" stroke-width="1.4"/>
      <path d="M14 ${big ? 48 : 54} L50 ${big ? 18 : 26} L86 ${big ? 48 : 54} z" fill="#d9b25a" stroke="#9a7a2a" stroke-width="2"/>
      <path d="M24 ${big ? 44 : 50} L50 ${big ? 24 : 32} L76 ${big ? 44 : 50}" stroke="#b8902e" stroke-width="1.5" fill="none"/>
      <rect x="43" y="${big ? 64 : 66}" width="14" height="${big ? 20 : 18}" rx="7" fill="#3a2410"/>
      ${big ? '<rect x="28" y="52" width="10" height="9" fill="#ffe08a" stroke="#6b4320"/><rect x="62" y="52" width="10" height="9" fill="#ffe08a" stroke="#6b4320"/>' : ''}</svg>`;
  }
  if (t === 'E') {
    const silo = L >= 5;
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="40" ry="8" fill="#00000030"/>
      ${silo ? '<rect x="70" y="26" width="18" height="58" rx="8" fill="#c0c9d0" stroke="#7d8890" stroke-width="2"/><path d="M70 40h18M70 54h18M70 68h18" stroke="#9aa5ad" stroke-width="1.4"/>' : ''}
      <path d="M14 46 L42 26 L70 46 V84 H14 Z" fill="#c4442e" stroke="#7a2416" stroke-width="2"/>
      <path d="M14 46 L42 26 L70 46" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8"/>
      <rect x="30" y="58" width="24" height="26" fill="#7a2416"/><path d="M30 58 l24 26 M54 58 l-24 26" stroke="#e6a07a" stroke-width="2"/>
      <rect x="4" y="72" width="14" height="12" fill="#c9954a" stroke="#7a5a2a"/><path d="M6 76h10" stroke="#ffd23f" stroke-width="3"/></svg>`;
  }
  if (t === 'P') {
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="34" ry="8" fill="#00000030"/>
      <path d="M30 26 h40 M33 26 V58 M67 26 V58" stroke="#6b4a1a" stroke-width="4" stroke-linecap="round"/>
      <path d="M26 24 L50 12 L74 24 z" fill="#8a5a2a"/>
      <path d="M46 30 v14" stroke="#5a3a1a" stroke-width="1.5"/><rect x="42" y="44" width="8" height="8" rx="1.5" fill="#8fa597"/>
      <ellipse cx="50" cy="60" rx="24" ry="8" fill="#2fb1ff" stroke="#6f7b74" stroke-width="3"/>
      <path d="M26 60 v18 a24 8 0 0 0 48 0 v-18" fill="#8d9a92" stroke="#5f6b64" stroke-width="2"/>
      <path d="M30 68h40M30 76h40" stroke="#6f7b74" stroke-width="1.5"/>${L >= 3 ? '<circle cx="80" cy="40" r="2.5" fill="#7fd1ff"/><circle cx="20" cy="46" r="2" fill="#7fd1ff"/>' : ''}</svg>`;
  }
  if (t === 'M') {
    return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="86" rx="40" ry="8" fill="#00000030"/>
      <rect x="18" y="46" width="64" height="36" fill="#9a6a3a" stroke="#5a3a1a" stroke-width="2"/>
      <path d="M12 46 L20 24 H80 L88 46 Z" fill="#f5c542"/>
      ${[0, 1, 2, 3].map((k) => `<path d="M${20 + k * 15} 24 h7.5 L${12 + k * 19 + 9.5} 46 h-9.5 z" fill="#2fa866"/>`).join('')}
      <path d="M12 46 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0 q4.7 6 9.4 0" fill="#f5c542" stroke="#c99a00"/>
      <rect x="26" y="58" width="48" height="10" rx="3" fill="#6b4320"/>
      <path d="M30 60 q6 6 12 0 M46 60 q6 6 12 0 M62 60 q6 6 12 0" stroke="#ffd23f" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      ${L >= 5 ? '<circle cx="80" cy="18" r="7" fill="#f5c542" stroke="#c99a00"/><text x="80" y="21.5" text-anchor="middle" font-size="9" font-weight="800" fill="#6b4a00">B</text>' : ''}</svg>`;
  }
  return '';
}

/* ------------------------------ plateau ------------------------------ */
export function boardHTML(f, { sel = -1, readOnly = false, now = Date.now() } = {}) {
  const as = F.assignment(f), workersAt = {};
  as.fields.forEach((x) => (workersAt[x.i] = x));
  const price = F.landPrice(f);
  let h = '';
  for (let i = 0; i < F.SIZE * F.SIZE; i++) {
    const own = f.own.includes(i), x = F.tile(f, i), q = f.q.find((y) => y.i === i);
    let cls = 'fm-tile', inner = '';
    if (!own) {
      const can = !readOnly && F.buyable(f, i);
      cls += can ? ' buy' : ' locked';
      inner = can ? `<span class="fm-buy">${icon('lock')}<small>${fmt(price)}</small></span>` : '';
    } else {
      cls += ' own';
      const shown = x || (q ? { t: q.t, l: q.l } : null);
      if (shown) {
        cls += ' b-' + shown.t + (!x ? ' ghost' : '');
        inner = `<span class="fm-art">${tileArt(shown.t, shown.l)}</span>${x ? `<span class="fm-lv">${x.l}</span>` : ''}`;
        const wa = workersAt[i];
        if (wa) inner += `<span class="fm-wk" title="${wa.w} / ${wa.cap} singes">${Array.from({ length: wa.cap }, (_, k) => `<i class="${k < wa.w ? 'on' : ''}"></i>`).join('')}</span>`;
      } else cls += ' empty';
      if (q) {
        const p = Math.max(0, Math.min(1, (now - q.start) / (q.end - q.start)));
        cls += ' work';
        inner += `<span class="fm-work"><i style="width:${p * 100}%"></i><small data-end="${q.end}">${dur(q.end - now)}</small></span>`;
      }
    }
    if (i === sel) cls += ' sel';
    h += `<button type="button" class="${cls}" data-i="${i}" ${readOnly ? 'tabindex="-1"' : ''}>${inner}</button>`;
  }
  return `<div class="fm-board ${readOnly ? 'ro' : ''}">${h}</div>`;
}

/* ------------------------------ minuterie globale ------------------------------ */
// Fait avancer la ferme toutes les secondes (où qu'on soit sur le site) : chantiers terminés, stock plein, paliers.
export function initFarm(wallet) {
  let fullWarned = false, lastAuto = 0, lastToast = 0;
  const iv = setInterval(() => {
    const raw = wallet.p.farm;
    if (!raw || !raw.v || !Array.isArray(raw.g)) return;
    const done = F.tick(raw);
    if (done.length) {
      done.forEach((q) => toast(`<b>${F.B[q.t].name}</b> ${q.l === 1 ? 'construite' : `niveau ${q.l}`} !`, 'win', 3500));
      sfx.coin();
      save(wallet, 'done');
      window.dispatchEvent(new CustomEvent('chibouk:farm', { detail: { done } }));
    }
    if ((raw.ov || 0) >= 1 && Date.now() - lastAuto >= 60000) { lastAuto = Date.now(); const loud = lastAuto - lastToast >= 600000; if (autoSell(wallet, raw, !loud) && loud) lastToast = lastAuto; } // message au plus toutes les 10 min
    const cap = F.capacity(raw);
    if (raw.b >= cap - 0.5 && raw.rate > 0 && !F.wonderLv(raw, 'comptoir')) { if (!fullWarned) { fullWarned = true; toast('Ton entrepôt est plein : vends ou dépense des bananes, sinon la récolte s\'arrête !', 'error', 6000); } }
    else if (raw.b < cap * 0.95) fullWarned = false;
    const ms = raw.ms || 0, next = MILESTONES.find((m) => m > ms && raw.rate >= m);
    if (next) { raw.ms = Math.max(...MILESTONES.filter((m) => raw.rate >= m)); save(wallet, 'milestone', { n: raw.ms }); }
  }, 1000);
  return { destroy: () => clearInterval(iv) };
}
function save(wallet, act, extra = {}) { wallet.touch({ type: 'farm', act, ...extra }); }
// Prix de vente complet d'une banane (marché, Grand Port, Bourse, thème équipé, bonus permanents, boosts de vente)
export const fullSellRate = (p, fm) => F.sellRate(fm) * (1 + cosBonus(p, 'farm') + lootPerm(p, 'sell')) * sellBoost(p);
// V40 : Comptoir des Singes : le surplus mis de côté quand l'entrepôt est plein est vendu tout seul
function autoSell(wallet, fm, quiet = false) {
  const n = Math.floor(fm.ov || 0);
  if (n < 1) return 0;
  const gain = Math.floor(n * fullSellRate(wallet.p, fm));
  fm.ov = Math.max(0, (fm.ov || 0) - n);
  if (gain < 1) return 0;
  fm.sold = (fm.sold || 0) + n; fm.ss = (fm.ss || 0) + n; fm.earned = (fm.earned || 0) + gain; fm.ovs = (fm.ovs || 0) + gain;
  wallet.credit('farm', gain, { bananas: n, auto: true });
  save(wallet, 'autosell', { bananas: n });
  if (!quiet) toast(`Comptoir des Singes : ${fmt(n)} bananes en trop vendues · +${fmt(gain)} ${CUR}`, 'win', 4000);
  return gain;
}

const frN = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
// Prix pour finir un chantier tout de suite (dépend du temps restant et du prix du chantier)
const rushPrice = (q) => F.rushCost(q.end - Date.now(), q.c || 0, (q.end - (q.start || q.end)) || 0);

/* ------------------------------ page ------------------------------ */
export function mount(view, { wallet, backend }) {
  let alive = true, tab = 'me', sel = -1;
  if (!hasFarm(wallet.p) || !Array.isArray(wallet.p.farm.g)) wallet.p.farm = F.normalize(wallet.p.farm);
  const f = () => wallet.p.farm;
  syncLatePerms(wallet.p); // bonus du Coffre de l'Empereur (production, expéditions)
  F.tick(f());

  view.innerHTML = `<div class="fm-wrap">
    <div class="game-head"><h1>Ferme à <span>bananes</span></h1><div class="actions"><span class="seg fm-tabs"><button data-t="me">Ma ferme</button><button data-t="late">Domaine</button><button data-t="nb">Les voisins</button></span><button class="btn btn-ghost btn-sm fm-helpbtn" id="fm-help" title="Comment ça marche ?"><span class="fm-help-l">Comment ça marche ?</span><span class="fm-help-s">?</span></button></div></div>
    <div id="fm-body"></div></div>`;
  $$('.fm-tabs button', view).forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
  $('#fm-help', view).onclick = help;

  function render() {
    if (!alive) return;
    $$('.fm-tabs button', view).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    if (tab === 'nb') return neighbors();
    if (tab === 'late') return domain();
    const fm = f();
    $('#fm-body', view).innerHTML = `
      <section class="fm-top">
        <div class="fm-stock"><div class="fm-stock-row"><span class="fm-big">${BANANA}<b id="fm-b"></b></span><small>/ <span id="fm-cap"></span></small></div>
          <div class="fm-bar"><i id="fm-bar"></i></div><small id="fm-full" class="muted"></small></div>
        <div class="fm-kpi"><span>Production</span><b id="fm-rate"></b><small id="fm-value" class="muted"></small><small id="fm-seeds" class="fm-seeds"></small><button class="btn btn-gold btn-sm" id="fm-replant" hidden></button></div>
        <div class="fm-kpi"><span>Singes ouvriers</span><b id="fm-wk"></b><small id="fm-need" class="fm-need"></small><button class="btn btn-ghost btn-sm" id="fm-hire"></button></div>
        <div class="fm-kpi"><span>Bâtisseurs</span><b id="fm-bu"></b>${fm.bu < 3 ? `<button class="btn btn-ghost btn-sm" id="fm-builder">+1 · ${fmt(F.BUILDERS[fm.bu + 1])} ${CUR}</button>` : '<small class="muted">équipe complète</small>'}</div>
        <button class="btn btn-gold fm-sellbtn" id="fm-sell">${BANANA}Marché</button>
      </section>
      <div class="fm-hint" id="fm-hint"></div>
      <div class="fm-main"><div id="fm-board-wrap">${boardHTML(fm, { sel })}</div><aside class="fm-side" id="fm-side"></aside></div>`;
    $('#fm-board-wrap', view).onclick = (e) => { const t = e.target.closest('.fm-tile'); if (!t) return; sel = +t.dataset.i; sfx.click(); refreshBoard(); side(); if (window.innerWidth < 980) $('#fm-side', view).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    $('#fm-hire', view).onclick = () => { const c = F.hireCost(f().w); act(c, () => F.hire(f(), wallet.balance), 'hire', 'Un singe de plus au travail !'); };
    const bb = $('#fm-builder', view); if (bb) bb.onclick = buyBuilder;
    $('#fm-sell', view).onclick = () => sell();
    // détail des boosts (bouton redessiné chaque seconde : on écoute sur le conteneur)
    $('#fm-rate', view).onclick = (e) => { const b = e.target.closest('[data-boostd]'); if (b) boostDetail(b.dataset.boostd); };
    $('#fm-replant', view).onclick = replant;
    side(); numbers();
  }

  function refreshBoard() { const w = $('#fm-board-wrap', view); if (w) w.innerHTML = boardHTML(f(), { sel }); }

  // chiffres du haut + barres de chantier (chaque seconde)
  function numbers() {
    if (!alive || tab !== 'me') return;
    const fm = f(), cap = F.capacity(fm), bm = F.boostAt(fm), rate = F.productionPerHour(fm) * bm;
    const el = (id) => $('#' + id, view);
    if (!el('fm-b')) return;
    el('fm-b').textContent = fmt(Math.floor(fm.b));
    el('fm-cap').textContent = fmt(cap);
    el('fm-bar').style.width = Math.min(100, (fm.b / Math.max(1, cap)) * 100) + '%';
    el('fm-bar').classList.toggle('full', fm.b >= cap - 0.5);
    el('fm-full').textContent = fm.b >= cap - 0.5 ? 'Entrepôt plein : la récolte est à l\'arrêt !' : rate > 0 ? `Plein dans ${dur(((cap - fm.b) / rate) * F.HOUR)}` : 'Aucun singe au travail';
    el('fm-rate').innerHTML = `${fmt(Math.round(rate))} <small>/ h</small>${bm > 1 ? ` <span class="fm-boost" title="${F.activeFarmBoosts(fm).map((b) => `×${String(b.m).replace('.', ',')} encore ${dur(b.u - Date.now())}`).join(' · ')} (cumul dégressif, ×${F.boostCap(fm)} max)">×${String(bm).replace('.', ',')}${F.activeFarmBoosts(fm).length > 1 ? ` (${F.activeFarmBoosts(fm).length} boosts)` : ''} · ${dur(F.boostEnd(fm) - Date.now())}</span> <button type="button" class="fm-bd" data-boostd="farm">Voir le détail</button>` : ''}${sellBoost(wallet.p) > 1 ? ` <button type="button" class="fm-bd sell" data-boostd="sell">Vente ×${String(sellBoost(wallet.p)).replace('.', ',')} · détail</button>` : ''}`;
    el('fm-value').textContent = `≈ ${fmt(Math.round(rate * F.sellRate(fm)))} ${CUR}/h à la vente`;
    el('fm-seeds').innerHTML = [fm.pr ? `${STAR} Prestige ${fm.pr} · ×${F.prestigeMult(fm)}` : '', fm.seeds ? `${SEED} ${fm.seeds} graine${fm.seeds > 1 ? 's' : ''} d'or · +${Math.round(F.SEED_BONUS * fm.seeds * 100)} %` : ''].filter(Boolean).join(' · ');
    const rb = el('fm-replant');
    rb.hidden = (fm.ss || 0) < F.prestigeNeed(fm);
    if (!rb.hidden) rb.innerHTML = `${STAR} Prestige · +100 %`;
    const hc = F.hireCost(fm.w), H = F.houses(fm);
    const away = F.awayAt(fm);
    el('fm-wk').innerHTML = `${fmt(fm.w)} / ${fmt(H)}${away ? ` <small class="fm-away" title="En expédition">(${away} en expédition)</small>` : fm.ex ? ' <small class="fm-away done">(expédition rentrée : voir Domaine)</small>' : ''}`;
    // singes nécessaires pour remplir toutes les places des bananeraies (construites)
    const need = F.totalSlots(fm), miss = need - fm.w, needEl = el('fm-need');
    needEl.className = 'fm-need ' + (miss > 0 ? 'miss' : miss < 0 ? 'extra' : 'ok');
    needEl.innerHTML = !need ? 'Aucune bananeraie' : miss > 0
      ? `${need} pour remplir les bananeraies · <b>encore ${miss}</b>${need > H ? ` <span title="Il faut plus de place dans les cabanes">(cabanes : +${need - H} places)</span>` : ''}`
      : miss < 0 ? `${need} places dans les bananeraies · <b>${-miss} en trop</b>` : `${need} / ${need} : bananeraies pleines`;
    const hb = el('fm-hire');
    hb.innerHTML = fm.w >= H ? 'Cabanes pleines' : `Embaucher · ${fmt(hc)} ${CUR}`;
    hb.disabled = fm.w >= H || !wallet.canAfford(hc);
    el('fm-bu').textContent = `${fm.q.length} / ${fm.bu} au travail`;
    const now = Date.now();
    $$('.fm-work', view).forEach((w) => { const s = w.querySelector('small'), end = +s.dataset.end, q = fm.q.find((y) => y.end === end); if (!q) return; s.textContent = dur(end - now); w.querySelector('i').style.width = Math.min(100, ((now - q.start) / (q.end - q.start)) * 100) + '%'; });
    $$('[data-left]', view).forEach((s) => (s.textContent = dur(+s.dataset.left - now)));
    $$('[data-rush]', view).forEach((b) => { const q = fm.q.find((y) => y.i === +b.dataset.rush); if (q) b.innerHTML = `Terminer maintenant · ${fmt(rushPrice(q))} ${CUR}`; });
    hint();
  }

  function hint() {
    const fm = f(), el = $('#fm-hint', view);
    if (!el) return;
    const as = F.assignment(fm), free = F.totalSlots(fm) - Math.min(fm.w, F.houses(fm)), cap = F.capacity(fm);
    const emptyOwned = fm.own.filter((i) => !F.tile(fm, i) && !fm.q.some((q) => q.i === i)).length;
    let t = '';
    if (fm.b >= cap - 0.5) t = 'Entrepôt plein ! Vends tes bananes au marché, ou améliore ton entrepôt.';
    else if (free > 0 && fm.w < F.houses(fm)) t = `Il reste ${free} place${free > 1 ? 's' : ''} dans tes bananeraies : embauche des singes !`;
    else if (free > 0) t = 'Tes bananeraies ont des places libres mais tes cabanes sont pleines : améliore ou construis une cabane.';
    else if (as.idle > 0) t = `${as.idle} singe${as.idle > 1 ? 's' : ''} sans travail : améliore une bananeraie (plus de places) ou construis-en une nouvelle.`;
    else if (!emptyOwned && fm.own.length < 49) t = 'Plus de place libre : achète une parcelle voisine (cases avec un cadenas).';
    else if (!fm.q.length) t = 'Tes bâtisseurs se tournent les pouces : lance une construction ou une amélioration !';
    el.innerHTML = t ? `${icon('bulb')}<span>${t}</span>` : '';
    el.hidden = !t;
  }

  /* ---------- panneau de droite ---------- */
  function side() {
    const fm = f(), el = $('#fm-side', view);
    if (!el) return;
    const now = Date.now();
    if (sel < 0) { el.innerHTML = overview(); const rb = $('[data-replant]', el); if (rb) rb.onclick = replant; return; }
    const own = fm.own.includes(sel), x = F.tile(fm, sel), q = fm.q.find((y) => y.i === sel);
    if (!own) {
      if (!F.buyable(fm, sel)) { el.innerHTML = `<h3>Parcelle sauvage</h3><p class="muted">Achète d'abord une parcelle qui touche ta ferme (cases avec un cadenas et un prix).</p>`; return; }
      const p = F.landPrice(fm);
      el.innerHTML = `<h3>Parcelle à vendre</h3><p>Agrandis ta ferme pour y construire de nouveaux bâtiments.</p>
        <p class="fm-price">${money(p)}</p><button class="btn btn-gold wide" id="fm-land" ${wallet.balance < p ? 'disabled' : ''}>Acheter la parcelle</button>
        <p class="muted fm-note">Payée en ${CUR}. Chaque parcelle coûte un peu plus cher que la précédente (${fm.own.length} / ${F.SIZE * F.SIZE}).</p>`;
      $('#fm-land', el).onclick = buyLand;
      return;
    }
    if (q) {
      el.innerHTML = `<h3>${F.B[q.t].name} · ${q.l === 1 ? 'construction' : `vers le niveau ${q.l}`}</h3>
        <p>Fin dans <b data-left="${q.end}">${dur(q.end - now)}</b></p>
        <button class="btn btn-gold wide" data-rush="${sel}">Terminer maintenant · ${fmt(rushPrice(q))} ${CUR}</button>
        <p class="muted fm-note">Le bâtiment continue de fonctionner pendant les travaux.</p>${x ? detail(x) : ''}`;
      $('[data-rush]', el).onclick = () => rush(sel);
      return;
    }
    if (!x) { el.innerHTML = buildMenu(); $$('[data-build]', el).forEach((b) => (b.onclick = () => { const t = b.dataset.build; act(F.costOf(f(), t, 1), () => F.build(f(), sel, t, Date.now(), wallet.balance), 'build', `Construction lancée : ${F.B[t].name}`); })); return; }
    const d = F.B[x.t], mxL = F.maxLevel(fm, x.t), max = x.l >= mxL, cost = max ? 0 : F.costOf(fm, x.t, x.l + 1), err = max ? null : F.canUpgrade(fm, sel, wallet.balance);
    el.innerHTML = `<div class="fm-side-head"><span class="fm-side-art">${tileArt(x.t, x.l)}</span><div><h3>${d.name}</h3><span class="tier-badge">Niveau ${x.l} / ${mxL}</span>${x.l > d.max ? ' <span class="tier-badge t-mythic">Ascension</span>' : ''}</div></div>
      <p class="muted">${d.desc}</p>${detail(x)}
      ${max ? `<p class="gold">Niveau maximum atteint.${mxL < F.absMax(x.t) ? ` L'Ascension (prestige ${F.ASCENSION_PR}) permet de monter jusqu'au niveau ${F.absMax(x.t)}.` : ''}</p>` : `<div class="fm-up"><div><small>Amélioration</small><b>${money(cost)}</b><small>${dur(F.buildTime(fm, x.t, x.l + 1))}</small></div>
        <button class="btn btn-gold" id="fm-up" ${err ? 'disabled' : ''}>Améliorer</button></div>${err ? `<p class="fm-err">${err}</p>` : ''}`}
      <button class="btn btn-ghost btn-sm fm-demo" id="fm-demo">Démolir</button>`;
    const up = $('#fm-up', el); if (up) up.onclick = () => act(F.costOf(f(), x.t, x.l + 1), () => F.upgrade(f(), sel, Date.now(), wallet.balance), 'upgrade', `Amélioration lancée : ${d.name} niveau ${x.l + 1}`);
    $('#fm-demo', el).onclick = async () => {
      const back = F.refundOf(f(), sel);
      const ok = await modal({ title: 'Démolir ?', html: `<p>Démolir ${d.name.toLowerCase()} niveau ${x.l} ?</p><p>Tu récupères <b class="gold">${money(back)}</b> : ${Math.round(F.REFUND * 100)} % de ce que tu as payé pour sa construction et ses améliorations (${money(F.investedIn(f(), sel))}).</p>`, buttons: [{ label: 'Annuler', value: false }, { label: `Démolir (+${fmt(back)})`, value: true, primary: true }] });
      if (!ok) return;
      const sel0 = sel, back2 = F.refundOf(f(), sel0);
      act(0, () => F.demolish(f(), sel0), 'demolish', `Bâtiment démoli : +${fmt(back2)} ${CUR}`, () => { if (back2 > 0) wallet.credit('farmrefund', back2, { what: 'demolish' }); });
    };
  }

  // production horaire si la case i contenait `tile` (null = case vide), le reste de la ferme ne bougeant pas
  function prodWith(fm, i, tile) { const g = fm.g.slice(); g[i] = tile; return F.productionPerHour({ ...fm, g }); }

  // effet actuel → niveau suivant
  function detail(x) {
    const fm = f(), nx = Math.min(x.l + 1, F.maxLevel(fm, x.t)), same = nx === x.l;
    const row = (label, a, b) => `<li><span>${label}</span><b>${a}${same ? '' : ` <i>→ ${b}</i>`}</b></li>`;
    if (x.t === 'F') {
      const wa = F.assignment(fm).fields.find((y) => y.i === sel);
      const irr = F.irrigation(fm, sel);
      return `<ul class="fm-stats">${row('Par singe', `${fmt(F.perWorker(x.l) * (1 + irr))}/h`, `${fmt(F.perWorker(nx) * (1 + irr))}/h`)}${row('Places', F.slots(x.l), F.slots(nx))}
        <li><span>Singes au travail</span><b>${wa ? wa.w : 0} / ${F.slots(x.l)}</b></li><li><span>Production</span><b>${fmt(wa ? wa.w * wa.per : 0)}/h</b></li>${irr ? `<li><span>Irrigation</span><b>+${Math.round(irr * 100)} %</b></li>` : ''}</ul>`;
    }
    if (x.t === 'C') return `<ul class="fm-stats">${row('Singes logés', F.housing(x.l), F.housing(nx))}</ul>`;
    if (x.t === 'E') return `<ul class="fm-stats">${row('Capacité', fmt(F.storageOf(fm, x.l)), fmt(F.storageOf(fm, nx)))}</ul>`;
    if (x.t === 'P') {
      // effet réel sur la ferme telle qu'elle est construite : production sans le puits / maintenant / au niveau suivant
      const now = F.productionPerHour(fm), without = prodWith(fm, sel, null), next = same ? now : prodWith(fm, sel, { t: 'P', l: nx });
      return `<ul class="fm-stats">${row('Bananeraies voisines', `+${Math.round(F.wellBonus(x.l) * 100)} %`, `+${Math.round(F.wellBonus(nx) * 100)} %`)}
        <li><span>Apport actuel</span><b>+${fmt(now - without)}/h</b></li>
        ${same ? '' : `<li class="fm-gain"><span>Après amélioration</span><b>+${fmt(next - now)} bananes/h</b></li>`}
        ${row('Production de la ferme', `${fmt(now)}/h`, `${fmt(next)}/h`)}</ul>`;
    }
    if (x.t === 'M') return `<ul class="fm-stats">${row('Prix de vente', `${frN(F.sellAt(x.l))} ${CUR}`, `${frN(F.sellAt(nx))} ${CUR}`)}</ul>`;
    return '';
  }

  function buildMenu() {
    const fm = f();
    return `<h3>Construire ici</h3><div class="fm-builds">${F.TYPES.map((t) => {
      const d = F.B[t], c = F.costOf(fm, t, 1), err = F.canBuild(fm, sel, t, wallet.balance);
      const eff = t === 'F' ? `${fmt(F.perWorker(1))}/h par singe, ${F.slots(1)} places` : t === 'C' ? `${F.housing(1)} singes logés` : t === 'E' ? `+${fmt(F.storageOf(fm, 1))} de stockage` : t === 'P' ? `+${Math.round(F.wellBonus(1) * 100)} % aux bananeraies voisines (ici : +${fmt(prodWith(fm, sel, { t: 'P', l: 1 }) - F.productionPerHour(fm))}/h)` : `vente à ${frN(F.sellAt(1))} ${CUR} la banane, +${frN(F.MARKET_STEP)} par niveau`;
      return `<div class="fm-build ${err ? 'off' : ''}"><span class="fm-build-art">${tileArt(t, 1)}</span><div><b>${d.name}</b><small>${eff}</small><small>${fmt(c)} ${CUR} · ${dur(F.buildTime(fm, t, 1))}</small>${err && err !== 'Pas assez de Brundles' ? `<small class="fm-err">${err}</small>` : ''}</div>
        <button class="btn btn-gold btn-sm" data-build="${t}" ${err ? 'disabled' : ''}>Construire</button></div>`;
    }).join('')}</div>`;
  }

  // Prestige : bananes vendues depuis le dernier prestige / palier, et bonus actuel
  function seedsHTML(fm) {
    const need = F.prestigeNeed(fm), ss = fm.ss || 0, ok = ss >= need;
    const pct = Math.max(0, Math.min(100, (ss / need) * 100));
    return `<div class="fm-seedbox"><h4>${STAR}Prestige${fm.pr ? ` ${fm.pr}` : ''}</h4>
      <p>${fm.pr ? `Ta production est multipliée par <b>×${F.prestigeMult(fm)}</b> grâce à tes ${fm.pr} prestige${fm.pr > 1 ? 's' : ''}.` : 'Vends 2 millions de bananes pour débloquer le prestige : ferme remise à zéro contre <b>+100 % de production pour toujours</b>.'}${fm.seeds ? ` Tes <b>${fm.seeds} graine${fm.seeds > 1 ? 's' : ''} d'or</b> ajoutent +${Math.round(F.SEED_BONUS * fm.seeds * 100)} %.` : ''}</p>
      <p class="muted">Vendues depuis ${fm.pr ? 'le dernier prestige' : 'le début'} : <b>${fmt(Math.floor(ss))}</b> / ${fmt(need)}${ok ? ' : prestige disponible !' : ''}. Le palier double à chaque prestige, et les bâtiments coûtent 30 % de plus${fm.pr ? ` (prix actuels ×${frN(Math.round(F.priceMult(fm) * 100) / 100)})` : ''}.</p>
      <div class="fm-bar"><i style="width:${pct}%"></i></div>
      ${ok ? `<button class="btn btn-gold btn-sm" data-replant>${STAR}Prestige : +100 % de production</button>` : ''}</div>`;
  }

  function overview() {
    const fm = f(), as = F.assignment(fm), now = Date.now();
    const q = [...fm.q].sort((a, b) => a.end - b.end);
    return `<h3>Ta ferme</h3>
      <p class="muted">Clique sur une case : un bâtiment pour l'améliorer, une case vide pour construire, une parcelle avec un cadenas pour l'acheter.</p>
      ${seedsHTML(fm)}
      <h4>Chantiers</h4>${q.length ? `<ul class="fm-q">${q.map((y) => `<li><span>${F.B[y.t].name} ${y.l === 1 ? '(nouveau)' : `niv. ${y.l}`}</span><b data-left="${y.end}">${dur(y.end - now)}</b></li>`).join('')}</ul>` : '<p class="muted">Aucun chantier en cours.</p>'}
      <h4>Bananeraies</h4><ul class="fm-q">${as.fields.sort((a, b) => b.w * b.per - a.w * a.per).map((x) => `<li><span>Niveau ${x.l} · ${x.w}/${x.cap} singes</span><b>${fmt(x.w * x.per)}/h</b></li>`).join('')}</ul>
      <ul class="fm-stats"><li><span>Bananes récoltées</span><b>${fmt(Math.floor(fm.tot))}</b></li><li><span>Bananes vendues</span><b>${fmt(fm.sold)}</b></li><li><span>${CUR} gagnés au marché</span><b>${fmt(fm.earned)}</b></li><li><span>Prix de vente</span><b>${frN(F.sellRate(fm))} ${CUR} / banane</b></li></ul>`;
  }

  /* ---------- actions ---------- */
  // Action payée en Brundles (cost = 0 : gratuite). Le prix est débité seulement si l'action a bien eu lieu.
  function act(cost, fn, name, okMsg, after = null) {
    F.tick(f());
    if (cost > 0 && !wallet.canAfford(cost)) { toast(`Pas assez de ${CUR} (il faut ${fmt(cost)})`, 'error'); sfx.lose(); return; }
    const err = fn();
    if (err) { toast(err, 'error'); sfx.lose(); return; }
    if (cost > 0) wallet.debit('farm', cost, { what: name });
    if (after) after();
    save(wallet, name);
    sfx.coin();
    if (okMsg) toast(okMsg, 'win', 2500);
    refreshBoard(); side(); numbers();
  }
  async function buyLand() {
    const fm = f(), p = F.landPrice(fm);
    if (!F.buyable(fm, sel)) return;
    if (!wallet.debit('farm', p, { what: 'land' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    fm.own.push(sel);
    save(wallet, 'land');
    sfx.win(false); toast('Nouvelle parcelle !', 'win');
    refreshBoard(); side(); numbers();
  }
  async function buyBuilder() {
    const fm = f(), p = F.BUILDERS[fm.bu + 1];
    if (!p) return;
    const ok = await modal({ title: 'Engager un bâtisseur', html: `<p>Un bâtisseur de plus permet de mener <b>${fm.bu + 1} chantiers en même temps</b>.</p><p>Prix : ${money(p)}</p>`, buttons: [{ label: 'Annuler', value: false }, { label: 'Engager', value: true, primary: true }] });
    if (!ok || !alive) return;
    if (!wallet.debit('farm', p, { what: 'builder' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    fm.bu += 1;
    save(wallet, 'builder');
    sfx.win(true); toast('Nouveau bâtisseur engagé !', 'win');
    render();
  }
  function rush(i) {
    const fm = f(), q = fm.q.find((y) => y.i === i);
    if (!q) return;
    const p = rushPrice(q);
    if (!wallet.debit('farm', p, { what: 'rush' })) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    q.end = Date.now();
    // la minuterie globale termine le chantier dans la seconde (message + sauvegarde)
    setTimeout(() => { refreshBoard(); side(); }, 1100);
  }
  function boostDetail(kind) {
    if (kind === 'farm') openBoostDetail('Boosts de récolte de la ferme', F.activeFarmBoosts(f()), (ms) => F.farmStack(ms, F.boostCap(f())), { cap: F.boostCap(f()) });
    else openBoostDetail('Boosts de vente des bananes', activeBoosts(wallet.p).filter((b) => b.g === 'sell'), (ms) => stackMult(ms, STACK_CAP.sell), { cap: STACK_CAP.sell });
  }
  // Marché : vendre des bananes contre des Brundles
  async function sell() {
    const fm = f();
    F.tick(fm);
    const cb = cosBonus(wallet.p, 'farm') + lootPerm(wallet.p, 'sell'), sb = sellBoost(wallet.p); // thème équipé + bonus permanent + boost de vente
    const rate = fullSellRate(wallet.p, fm);
    const have = Math.floor(fm.b);
    let amount = 0;
    const res = await modal({ title: 'Marché aux bananes', cls: 'fm-market', html: `
      <p>Prix de vente : <b>${frN(rate)} ${CUR}</b> la banane${cb || sb > 1 ? ` <small class="sh-bonus">bonus +${Math.round(cb * 100)} %${sb > 1 ? ` et boost ×${String(sb).replace('.', ',')}` : ''}</small>` : ''}${F.findType(fm, 'M') ? (F.findType(fm, 'M').l < F.B.M.max ? ' (améliore ton marché pour vendre plus cher, jusqu\'à 1 ' + CUR + ')' : ' (prix maximum)') : ' (construis un marché pour vendre plus cher)'}.</p>
      ${sb > 1 ? `<details class="bd-inline"><summary>Voir le détail des boosts de vente</summary><div class="bd">${boostDetailHTML(activeBoosts(wallet.p).filter((b) => b.g === 'sell'), (ms) => stackMult(ms, STACK_CAP.sell), { cap: STACK_CAP.sell })}</div></details>` : ''}
      ${have < 10 ? '<p class="muted">Il faut au moins 10 bananes pour vendre.</p>' : `<div class="fm-sell-pick">${[25, 50, 75, 100].map((p) => `<button type="button" class="btn btn-ghost btn-sm" data-p="${p}">${p} %</button>`).join('')}</div>
      <input type="range" id="fm-sell-r" min="10" max="${have}" value="${have}" step="1">
      <p class="fm-sell-sum"><span id="fm-sell-b"></span> → <b id="fm-sell-v"></b></p>`}`,
      buttons: [{ label: 'Annuler', value: false }, { label: 'Vendre', value: 'sell', primary: true }],
      onOpen: (m) => {
        const r = m.querySelector('#fm-sell-r');
        if (!r) return;
        const upd = () => { amount = +r.value; m.querySelector('#fm-sell-b').innerHTML = ban(amount); m.querySelector('#fm-sell-v').innerHTML = money(Math.floor(amount * rate)); };
        r.oninput = upd;
        m.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { r.value = Math.max(10, Math.floor((have * +b.dataset.p) / 100)); upd(); }));
        upd();
      } });
    if (!alive || res !== 'sell' || amount < 1) return;
    F.tick(fm);
    amount = Math.min(amount, Math.floor(fm.b));
    const gain = Math.floor(amount * rate);
    if (amount < 1 || gain < 1) return;
    fm.b -= amount; fm.sold = (fm.sold || 0) + amount; fm.ss = (fm.ss || 0) + amount; fm.earned = (fm.earned || 0) + gain;
    wallet.credit('farm', gain, { bananas: amount });
    save(wallet, 'sell', { bananas: amount });
    sfx.win(gain >= 1000); coinRain(Math.min(40, 8 + Math.floor(gain / 200)));
    toast(`${fmt(amount)} bananes vendues : +${fmt(gain)} ${CUR}`, 'win');
    numbers(); if (sel < 0) side();
  }

  // Prestige : ferme remise à zéro contre +100 % de production pour toujours.
  // Option : tout reconstruire à l'identique tout de suite (bâtiments, niveaux, singes), chantiers terminés payés.
  async function replant() {
    const fm = f();
    F.tick(fm);
    const err = F.canPrestige(fm);
    if (err) { toast(err, 'error'); return; }
    const after = (fm.pr || 0) + 1;
    const quote = F.replayQuote(fm);
    const pm = (n) => frN(Math.round(Math.pow(F.PRESTIGE_PRICE, n) * 100) / 100);
    const rich = !quote.err && wallet.canAfford(quote.total);
    const ok = await modal({ title: `Prestige ${after} ?`, cls: 'wide', html: `
      <p>Ta production passe de <b>×${F.prestigeMult(fm)}</b> à <b class="gold">×${after + 1}</b>, pour toujours.</p>
      <ul class="muted"><li><b>Conservé</b> : tes ${fm.own.length} parcelles, tes ${fm.bu} bâtisseur${fm.bu > 1 ? 's' : ''}, tes graines d'or, ta vitesse de construction, tes boosts en cours et tes statistiques.</li>
      <li><b>Remis à zéro</b> : tous les bâtiments, les singes et les bananes en stock (vends-les avant !).</li>
      <li>Tu repars avec une bananeraie, une cabane et un entrepôt de niveau <b>${Math.min(6, after + 1)}</b>, et un entrepôt rempli aux 4/5.</li>
      <li><b>Les bâtiments coûtent 30 % de plus</b> à chaque prestige : prix ×${pm(after)} après celui-ci${fm.pr ? ` (×${pm(fm.pr)} aujourd'hui)` : ''}.</li></ul>
      ${quote.err ? '' : `<div class="fm-replay"><b>${STAR}Option : tout reconstruire tout de suite</b>
        <p class="muted">Ta ferme est remise exactement comme maintenant (${F.built(fm).length} bâtiments aux mêmes places et aux mêmes niveaux, ${quote.w} singes), au nouveau prix, sans attendre les chantiers.</p>
        <ul class="fm-replay-cost"><li><span>Bâtiments (${quote.levels} niveaux, prix ×${pm(after)})</span><b>${money(quote.build)}</b></li>
          <li><span>Chantiers terminés tout de suite</span><b>${money(quote.rush)}</b></li>
          <li><span>Singes (${quote.w - 2} à embaucher)</span><b>${money(quote.hire)}</b></li>
          <li class="tot"><span>Total</span><b class="gold">${money(quote.total)}</b></li></ul>
        ${rich ? '' : `<p class="neg">Il te manque ${money(quote.total - wallet.balance)} pour cette option.</p>`}</div>`}
      <p class="muted fm-note">Prochain prestige après ${fmt(F.PRESTIGE_BASE * 2 ** after)} bananes vendues.</p>`,
      buttons: [{ label: 'Pas encore', value: false }, ...(quote.err ? [] : [{ label: `Prestige + tout reconstruire (${fmt(quote.total)})`, value: 'replay' }]), { label: `Prestige (×${after + 1})`, value: true, primary: true }] });
    if (!ok || !alive) return;
    if (ok === 'replay') {
      // le prix est recalculé au moment du clic (chantiers, singes ou solde ont pu changer pendant la fenêtre)
      F.tick(fm);
      const q = F.replayQuote(fm);
      if (q.err) { toast(q.err, 'error'); return; }
      if (!wallet.canAfford(q.total)) { toast(`Pas assez de ${CUR} : il faut ${fmt(q.total)} pour tout reconstruire`, 'error'); sfx.lose(); return; }
      if (F.prestigeReplay(fm, q)) return;
      wallet.debit('farm', q.total, { what: 'replay', build: q.build, rush: q.rush, hire: q.hire });
      sel = -1;
      save(wallet, 'prestige', { pr: fm.pr, replay: q.total });
      sfx.bonus(); coinRain(60);
      toast(`Prestige ${fm.pr} : ferme reconstruite à l'identique, elle produit maintenant ×${F.prestigeMult(fm)} !`, 'win', 6000);
      render();
      return;
    }
    if (F.prestige(fm)) return;
    sel = -1;
    save(wallet, 'prestige', { pr: fm.pr });
    sfx.bonus(); coinRain(60);
    toast(`Prestige ${fm.pr} : ta ferme produit maintenant ×${F.prestigeMult(fm)} !`, 'win', 6000);
    render();
  }

  function help() {
    modal({ title: 'La ferme à bananes', cls: 'wide', html: `<ul class="muted fm-help">
      <li>Tes <b>singes ouvriers</b> récoltent des bananes dans les <b>bananeraies</b>, même quand tu n'es pas là.</li>
      <li>Chaque bananeraie a un nombre de <b>places</b>. Les singes logent dans les <b>cabanes</b> : embauche-en tant qu'il y a de la place et du travail.</li>
      <li>Les bananes s'entassent dans les <b>entrepôts</b>. Quand ils sont pleins, la récolte s'arrête : reviens régulièrement !</li>
      <li>Les <b>puits</b> irriguent les 8 cases autour (bonus aux bananeraies voisines), le <b>marché</b> fait monter le prix de vente.</li>
      <li>Les bananes se <b>vendent</b> contre des ${CUR} au marché : ${frN(F.sellAt(0))} ${CUR} la banane, jusqu'à <b>1 ${CUR}</b> avec un marché niveau 10.</li>
      <li>Constructions, améliorations et singes se paient directement en <b>${CUR}</b>.</li>
      <li>Les chantiers prennent du temps (de quelques secondes à plusieurs heures). Engage des <b>bâtisseurs</b> pour en mener plusieurs à la fois, ou termine-les tout de suite en payant des ${CUR}.</li>
      <li>Les <b>parcelles</b> autour de ta ferme s'achètent en ${CUR}.</li>
      <li><b>Prestige</b> : après 2 millions de bananes vendues, tu peux remettre ta ferme à zéro contre <b>+100 % de production pour toujours</b> (×2, puis ×3, ×4…). Tu gardes tes parcelles, tes bâtisseurs et tes graines d'or. Le palier double à chaque fois : 2 M, 4 M, 8 M de bananes vendues… Chaque prestige rend les bâtiments <b>30 % plus chers</b>. La capacité des entrepôts, elle, est multipliée comme la production (×2, ×3…). Tu peux aussi tout reconstruire à l'identique d'un coup, en payant les bâtiments, les chantiers terminés tout de suite et les singes.</li>
      <li><b>Graines d'or</b> (caisses) : +5 % de production chacune, pour toujours.</li>
      <li><b>Boosts de récolte</b> (caisses) : ils se cumulent, de moins en moins (le 2e compte pour 1/2, le 3e pour 1/3, le 4e pour 1/4…) mais chacun ajoute toujours un peu, jusqu'à ×5 (×10 avec l'Arbre-Monde).</li>
      <li><b>Domaine</b> (fin de partie) : paliers de prestige (3, 5, 8 et 12), <b>Ascension</b> au prestige 5 (bananeraies jusqu'au niveau 20, cabanes et entrepôts jusqu'au 17), <b>Merveilles</b> (bâtiments uniques gardés après les prestiges), <b>bâtiments mythiques</b> dès le prestige 8 (Grenier céleste : entrepôts jusqu'à ×11 ; Comptoir des Singes : le surplus d'un entrepôt plein est vendu tout seul, même hors ligne ; Bourse aux bananes : +100 % au prix de vente ; Cœur de l'Arbre-Monde : boosts de récolte jusqu'à ×20) et <b>expéditions</b> (des singes partent chercher des Brundles, des boosts, des graines d'or et des objets rares).</li>
      <li>Onglet <b>Les voisins</b> : visite les fermes des autres joueurs et compare vos productions.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  }

  /* ---------- voisins ---------- */
  /* ---------- Domaine (V38) : paliers de prestige, merveilles, expéditions ---------- */
  function domain() {
    if (!alive || tab !== 'late') return;
    const fm = f(), now = Date.now(), pr = fm.pr || 0;
    F.tick(fm);
    const ex = fm.ex, xd = ex && F.expedition(ex.id);
    const pct = (a, b) => Math.max(0, Math.min(100, (a / Math.max(1, b)) * 100));
    $('#fm-body', view).innerHTML = `<div class="dm-wrap">
      <section class="panel dm-sec"><h2 class="dm-h">${STAR}Paliers de prestige <small class="muted">tu es au prestige ${pr} · production ×${F.prestigeMult(fm)}${F.milestoneProd(fm) ? ` · bonus des paliers +${Math.round(F.milestoneProd(fm) * 100)} %` : ''}${fm.lp ? ` · Empereur +${Math.round(fm.lp * 100)} %` : ''}</small></h2>
        <ol class="dm-ms">${F.MILESTONES.map((m) => `<li class="${pr >= m.pr ? 'done' : ''}"><b>Prestige ${m.pr}</b><span>${esc(m.txt)}</span><i>${pr >= m.pr ? icon('check') : icon('lock')}</i></li>`).join('')}</ol>
        <p class="muted dm-note">Le prestige demande deux fois plus de bananes vendues à chaque fois : les derniers paliers sont faits pour durer.</p></section>
      <section class="panel dm-sec"><h2 class="dm-h">${icon('tower')}Merveilles <small class="muted">bâtiments uniques, hors de la grille : ils restent après chaque prestige</small></h2>
        <div class="dm-wonders">${Object.keys(F.WONDERS).map(bCard).join('')}</div></section>
      <section class="panel dm-sec dm-mythic"><h2 class="dm-h">${icon('star')}Bâtiments mythiques <small class="muted">pour les fermes géantes : stockage, vente automatique, prix et plafond des boosts · gardés après chaque prestige</small></h2>
        <div class="dm-wonders">${Object.keys(F.MYTHIC_B).map(bCard).join('')}</div>
        ${F.wonderLv(fm, 'comptoir') ? `<p class="muted dm-note">Comptoir des Singes : ${fm.ov >= 1 ? `${fmt(Math.floor(fm.ov))} bananes en trop attendent la prochaine vente (toutes les minutes) · ` : ''}${fmtBig(Math.floor(fm.ovs || 0))} ${CUR} gagnés par la vente automatique.</p>` : ''}</section>
      <section class="panel dm-sec"><h2 class="dm-h">${icon('globe')}Expéditions <small class="muted">${fm.exn ? `${fm.exn} réussie${fm.exn > 1 ? 's' : ''}` : 'envoie des singes chercher des trésors'}${fm.lx ? ` · butin +${Math.round(fm.lx * 100)} % (Coffre de l'Empereur)` : ''}</small></h2>
        ${ex ? (ex.end > now ? `<div class="dm-ex-run"><b>${esc(xd.name)}</b><span>${ex.n} singes partis · retour dans <b data-left="${ex.end}">${dur(ex.end - now)}</b></span><div class="fm-bar"><i data-exbar style="width:${pct(now - ex.start, ex.end - ex.start)}%"></i></div><small class="muted">Pendant l'expédition, ces singes ne récoltent pas.</small></div>`
          : `<div class="dm-ex-run done"><b>${esc(xd.name)} : les singes sont rentrés !</b><button class="btn btn-gold" data-exclaim>Voir le butin</button></div>`) : ''}
        <div class="dm-exps">${F.EXPEDITIONS.map((x) => {
          const err = F.canExpedition(fm, x.id, now), locked = pr < x.pr;
          return `<div class="dm-x ${locked ? 'locked' : ''}"><b>${esc(x.name)}</b><span>${dur(F.expDuration(fm, x))} · ${x.n} singes</span>
            <small>Butin : des Brundles (≈ ${Math.round(x.k * 100)} % de ${x.h} h de récolte vendue), boost de récolte ×${String(x.boost[1]).replace('.', ',')} (${Math.round(x.boost[0] * 100)} %), graine d'or (${Math.round(x.seed[0] * 100)} %), objet rare exclusif (${Math.round(x.cos * 100)} %)</small>
            ${locked ? `<small class="muted">${icon('lock')}Prestige ${x.pr}</small>` : `<button class="btn btn-ghost btn-sm" data-exgo="${x.id}" ${err ? 'disabled' : ''}>Partir</button>${err && !ex ? `<small class="fm-err">${esc(err)}</small>` : ''}`}</div>`;
        }).join('')}</div>
        <p class="muted dm-note">Objets rares des expéditions : ${EXPEDITION_ITEMS.map((it) => `<span class="${owns(wallet.p, it.id) ? 'gold' : ''}">${esc(it.name)}</span>`).join(' · ')}. Une seule expédition à la fois ; pas de prestige tant qu'elle n'est pas rentrée.</p></section>
    </div>`;
    $$('[data-wonder]', view).forEach((b) => (b.onclick = () => wonder(b.dataset.wonder)));
    $$('[data-exgo]', view).forEach((b) => (b.onclick = () => goExpedition(b.dataset.exgo)));
    const cl = $('[data-exclaim]', view); if (cl) cl.onclick = claimExpedition;
  }
  function bCard(k) {
    const fm = f(), pr = fm.pr || 0, w = bDef(k), my = !!F.MYTHIC_B[k];
    const L = F.wonderLv(fm, k), max = L >= w.max, locked = pr < w.pr, req = !locked && w.req ? w.req(fm) : null, cost = max ? 0 : F.wonderCost(k, L + 1), err = F.canWonder(fm, k, wallet.balance);
    return `<div class="dm-w ${my ? 'mythic' : ''} ${locked || req ? 'locked' : ''} ${L ? 'built' : ''} w-${k}"><div class="dm-w-art">${BUILD_ART[k]}</div>
      <b>${esc(w.name)}</b><span class="tier-badge">${locked ? `Prestige ${w.pr}` : `Niveau ${L} / ${w.max}`}</span>
      <small>${esc(w.desc)}</small>${L ? `<small class="gold">Actuellement : ${esc(w.effect(L))}</small>` : ''}
      ${locked ? `<small class="muted">${icon('lock')}Débloqué au prestige ${w.pr}</small>` : max ? `<small class="gold">${my ? 'Bâtiment achevé' : 'Merveille achevée'} !</small>` : req ? `<small class="muted">${icon('lock')}${esc(req)}</small>` : `<button class="btn btn-gold btn-sm" data-wonder="${k}" ${err ? 'disabled' : ''}>${L ? 'Agrandir' : 'Construire'} · ${fmtBig(cost)}</button>`}</div>`;
  }
  async function wonder(k) {
    const fm = f(), w = bDef(k), L = F.wonderLv(fm, k), cost = F.wonderCost(k, L + 1);
    const ok = await modal({ title: `${L ? 'Agrandir' : 'Construire'} : ${esc(w.name)}`, html: `<p>${esc(w.desc)}</p><p>Niveau ${L} → <b>${L + 1}</b> : ${esc(w.effect(L + 1))}.</p><p>Prix : <b>${money(cost)}</b>. Instantané, et gardé après chaque prestige.</p>`,
      buttons: [{ label: 'Annuler', value: false }, { label: `${L ? 'Agrandir' : 'Construire'} (${fmtBig(cost)})`, value: true, primary: true }] });
    if (!ok || !alive) return;
    F.tick(fm);
    if (!wallet.canAfford(cost)) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    const err = F.buildWonder(fm, k, wallet.balance);
    if (err) { toast(err, 'error'); return; }
    wallet.debit('farm', cost, { what: 'wonder', wonder: k, level: L + 1 });
    save(wallet, 'wonder', { wonder: k, level: L + 1, max: w.max, ...(F.MYTHIC_B[k] ? { my: true } : {}) });
    sfx.bonus(); coinRain(40);
    toast(`${esc(w.name)} : niveau ${L + 1} !`, 'win');
    domain();
  }
  async function goExpedition(id) {
    const fm = f(), x = F.expedition(id);
    const ok = await modal({ title: `Expédition : ${esc(x.name)}`, html: `<p><b>${x.n} singes</b> partent pendant <b>${dur(F.expDuration(fm, x))}</b>. Ils ne récoltent pas pendant ce temps (production actuelle : ${fmt(F.productionPerHour(fm))}/h, pendant l'expédition : ${fmt(F.assignment({ ...fm, ex: { n: x.n, end: Infinity } }).fields.reduce((a, y) => a + y.w * y.per, 0))}/h).</p><p class="muted">Au retour : des Brundles, et peut-être un boost de récolte, des graines d'or ou un objet rare.</p>`,
      buttons: [{ label: 'Annuler', value: false }, { label: 'Envoyer les singes', value: true, primary: true }] });
    if (!ok || !alive) return;
    const err = F.startExpedition(fm, id);
    if (err) { toast(err, 'error'); return; }
    save(wallet, 'expedition', { id });
    sfx.click(); toast(`Les singes partent vers : ${esc(x.name)}`);
    domain();
  }
  async function claimExpedition() {
    const fm = f(), x = F.expedition(fm.ex && fm.ex.id);
    const r = F.claimExpedition(fm);
    if (r.err) { toast(r.err, 'error'); return; }
    const L = r.loot, lines = [];
    let item = null, extra = 0;
    if (L.cos) {
      const left = EXPEDITION_ITEMS.filter((it) => !owns(wallet.p, it.id));
      if (left.length) { item = left[Math.floor(Math.random() * left.length)]; wallet.p.shop = { owned: { ...((wallet.p.shop && wallet.p.shop.owned) || {}), [item.id]: Date.now() }, eq: { ...((wallet.p.shop && wallet.p.shop.eq) || {}) } }; wallet.set('shop', wallet.p.shop); }
      else extra = L.brundles; // tout est déjà trouvé : butin doublé
    }
    wallet.credit('expedition', L.brundles + extra, { id: L.id });
    lines.push(`<li>${money(L.brundles + extra)}${extra ? ' <small>(butin doublé : tu as déjà tous les objets rares)</small>' : ''}</li>`);
    if (L.boost) lines.push(`<li>Boost de récolte <b>×${String(L.boost.m).replace('.', ',')}</b> pendant ${L.boost.h} h</li>`);
    if (L.seeds) lines.push(`<li>${SEED} <b>${L.seeds} graine${L.seeds > 1 ? 's' : ''} d'or</b> (+${L.seeds * 5} % de production pour toujours)</li>`);
    if (item) lines.push(`<li class="dm-rare">Objet rare : <b>« ${esc(item.name)} »</b> (${item.cat === 'title' ? 'titre' : item.cat === 'frame' ? 'cadre' : 'dos de cartes'}) : équipe-le dans la boutique !</li>`);
    save(wallet, 'expedition-done', { id: L.id });
    if (item) window.dispatchEvent(new CustomEvent('chibouk:feed', { detail: { type: 'expedition', name: item.name, place: x.name } }));
    sfx.win(!!(item || L.seeds)); coinRain(item ? 60 : 25);
    domain();
    modal({ title: 'Retour d\'expédition', html: `<p>Les singes reviennent de « ${esc(x.name)} » avec :</p><ul class="dm-loot">${lines.join('')}</ul>`, buttons: [{ label: 'Super !', value: true, primary: true }] });
  }

  async function neighbors() {
    const body = $('#fm-body', view);
    body.innerHTML = '<div class="panel"><p class="muted">Chargement des fermes…</p></div>';
    let players;
    try { players = await getPlayers(backend, wallet, false); } catch (e) { body.innerHTML = `<div class="panel"><p class="neg">Impossible de charger les fermes (${esc(e.message)}).</p></div>`; return; }
    if (!alive || tab !== 'nb') return;
    const now = Date.now();
    const rows = players.filter(hasFarm).map((p) => { const s = snapshot(p.farm, now); return { p, s, rate: F.productionPerHour(s) }; }).sort((a, b) => b.rate - a.rate);
    body.innerHTML = `<div class="panel"><h2><span class="h-ic">${BANANA}Les fermes de la jungle</span></h2>
      ${rows.length ? `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Fermier</th><th class="r">Production</th><th class="r">Parcelles</th><th class="r">Singes</th><th class="r">Prestige · graines</th><th class="r">Bananes vendues</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.p.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.p.uid}">${avatarHTML(r.p, 'av-sm')}${esc(r.p.pseudo)}${r.p.uid === wallet.uid ? ' (toi)' : ''}</button></td>
        <td class="r"><b>${fmt(Math.round(r.rate))}</b> /h</td><td class="r">${r.s.own.length}</td><td class="r">${r.s.w}</td><td class="r">${r.s.pr ? `★${r.s.pr} · ` : ''}${r.s.seeds || 0}</td><td class="r">${fmt(r.s.sold || 0)}</td><td><button class="btn btn-ghost btn-sm" data-visit="${r.p.uid}">Visiter</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Personne n\'a encore de ferme.</p>'}
      <p class="muted fm-note">Les fermes des autres sont mises à jour à chacune de leurs sauvegardes (la production continue entre-temps).</p></div>`;
    $$('[data-visit]', body).forEach((b) => (b.onclick = () => { const r = rows.find((x) => x.p.uid === b.dataset.visit); if (r) visit(r.p); }));
  }
  render();
  const iv = setInterval(() => {
    numbers();
    if (tab === 'late' && alive) {
      const fm = f(), now = Date.now();
      $$('[data-left]', view).forEach((x) => (x.textContent = dur(+x.dataset.left - now)));
      const bar = $('[data-exbar]', view); if (bar && fm.ex) bar.style.width = Math.min(100, ((now - fm.ex.start) / (fm.ex.end - fm.ex.start)) * 100) + '%';
      if (fm.ex && fm.ex.end <= now && !$('[data-exclaim]', view)) domain(); // les singes rentrent : bouton du butin
    }
  }, 1000);
  const onFarm = () => { if (tab === 'me') { refreshBoard(); side(); numbers(); } };
  window.addEventListener('chibouk:farm', onFarm);
  return () => { alive = false; clearInterval(iv); window.removeEventListener('chibouk:farm', onFarm); };
}

// Visite (lecture seule) de la ferme d'un joueur
export function visit(p) {
  const s = snapshot(p.farm), rate = F.productionPerHour(s);
  modal({ title: `La ferme de ${esc(p.pseudo)}`, cls: 'wide fm-visit', html: `
    <div class="fm-visit-kpis"><div><span>Production</span><b>${fmt(Math.round(rate))} /h</b></div><div><span>Parcelles</span><b>${s.own.length} / ${F.SIZE * F.SIZE}</b></div><div><span>Singes</span><b>${s.w}</b></div><div><span>Niveaux cumulés</span><b>${F.levels(s)}</b></div><div><span>Prestige · graines</span><b>${s.pr || 0} · ${s.seeds || 0}</b></div><div><span>Vendues</span><b>${fmt(s.sold || 0)}</b></div></div>
    ${boardHTML(s, { readOnly: true })}`, buttons: [{ label: 'Fermer', value: true, primary: true }] });
}
