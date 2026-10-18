// Boutique cosmétique : cadres d'avatar, titres, dos de cartes, thèmes de la slot, effets de victoire.
// Purement visuel, mais ça retire des Brundles du circuit (sinon les soldes gonflent à l'infini).
import { icon } from './art.js';
import { $, $$, fmt, money, esc, toast, modal, coinRain, setWinFx, CUR } from './ui.js';
import { avatarHTML } from './profile.js';
import { sfx } from './sfx.js';
import { bonusText, BONUS_KIND, CAT_KIND } from './bonus.js';

export const SHOP_CATS = {
  frame: { name: 'Cadres d\'avatar', icon: 'user', desc: 'Autour de ta photo, partout où elle apparaît. Bonus du cadre équipé : gains des mini-jeux.' },
  title: { name: 'Titres', icon: 'medal', desc: 'Affiché sous ton pseudo dans les classements et sur ton profil. Bonus du titre équipé : roue du jour et quêtes.' },
  cardback: { name: 'Dos de cartes', icon: 'blackjack', desc: 'Le dos des cartes au blackjack et au Hi-Lo. Bonus du dos équipé : rakeback.' },
  theme: { name: 'Thèmes de la slot', icon: 'slots', desc: 'L\'habillage de la Chibouk Slot. Bonus du thème équipé : vente des bananes de la ferme.' },
  effect: { name: 'Effets de victoire', icon: 'bolt', desc: 'Ce qui tombe du ciel quand tu gagnes gros. Bonus de l\'effet équipé : intérêts du coffre.' },
};

// price 0 = offert à tout le monde (choix par défaut)
export const ITEMS = [
  { id: 'fr-none', cat: 'frame', name: 'Sans cadre', price: 0 },
  { id: 'fr-bronze', cat: 'frame', name: 'Bronze', price: 5000 },
  { id: 'fr-silver', cat: 'frame', name: 'Argent', price: 15000 },
  { id: 'fr-gold', cat: 'frame', name: 'Or', price: 50000 },
  { id: 'fr-vine', cat: 'frame', name: 'Liane de la jungle', price: 100000 },
  { id: 'fr-neon', cat: 'frame', name: 'Néon', price: 250000 },
  { id: 'fr-fire', cat: 'frame', name: 'Flammes', price: 1000000 },
  { id: 'fr-rainbow', cat: 'frame', name: 'Arc-en-ciel', price: 5000000 },
  { id: 'fr-diamond', cat: 'frame', name: 'Diamant', price: 25000000 },

  { id: 'ti-none', cat: 'title', name: 'Sans titre', price: 0 },
  { id: 'ti-petit', cat: 'title', name: 'Petit joueur', price: 2000 },
  { id: 'ti-banane', cat: 'title', name: 'Accro aux bananes', price: 10000 },
  { id: 'ti-bluff', cat: 'title', name: 'Roi du bluff', price: 25000 },
  { id: 'ti-croupier', cat: 'title', name: 'Croupier de la jungle', price: 50000 },
  { id: 'ti-gorille', cat: 'title', name: 'Gorille de salon', price: 100000 },
  { id: 'ti-chasseur', cat: 'title', name: 'Chasseur de jackpots', price: 500000 },
  { id: 'ti-parrain', cat: 'title', name: 'Le Parrain des singes', price: 2000000 },
  { id: 'ti-legende', cat: 'title', name: 'Légende de la Chibouk', price: 10000000 },
  { id: 'ti-milliard', cat: 'title', name: 'Milliardaire en bananes', price: 100000000 },

  { id: 'cb-classic', cat: 'cardback', name: 'Classique rouge', price: 0 },
  { id: 'cb-blue', cat: 'cardback', name: 'Bleu nuit', price: 10000 },
  { id: 'cb-jungle', cat: 'cardback', name: 'Jungle', price: 50000 },
  { id: 'cb-gold', cat: 'cardback', name: 'Or massif', price: 200000 },
  { id: 'cb-neon', cat: 'cardback', name: 'Néon', price: 1000000 },

  { id: 'th-classic', cat: 'theme', name: 'Classique', price: 0 },
  { id: 'th-jungle', cat: 'theme', name: 'Jungle', price: 25000 },
  { id: 'th-ocean', cat: 'theme', name: 'Océan', price: 75000 },
  { id: 'th-royal', cat: 'theme', name: 'Royal', price: 300000 },
  { id: 'th-neon', cat: 'theme', name: 'Néon', price: 1500000 },

  { id: 'fx-coins', cat: 'effect', name: 'Pluie de Brundles', price: 0 },
  { id: 'fx-banana', cat: 'effect', name: 'Pluie de bananes', price: 20000 },
  { id: 'fx-confetti', cat: 'effect', name: 'Confettis', price: 60000 },
  { id: 'fx-stars', cat: 'effect', name: 'Étoiles filantes', price: 150000 },
  { id: 'fx-diamond', cat: 'effect', name: 'Diamants', price: 750000 },

  // Exclusifs des caisses (impossibles à acheter : seulement à gagner en ouvrant des caisses)
  { id: 'ti-curieux', cat: 'title', name: 'Curieux de nature', loot: 'common' },
  { id: 'ti-noix', cat: 'title', name: 'Casseur de noix', loot: 'common' },
  { id: 'fr-coco', cat: 'frame', name: 'Noix de coco', loot: 'common' },
  { id: 'cb-coco', cat: 'cardback', name: 'Noix de coco', loot: 'common' },
  { id: 'ti-ouvreur', cat: 'title', name: 'Ouvreur de caisses', loot: 'rare' },
  { id: 'ti-veinard', cat: 'title', name: 'Sacré veinard', loot: 'rare' },
  { id: 'ti-mystere', cat: 'title', name: 'Singe mystère', loot: 'epic' },
  { id: 'ti-collec', cat: 'title', name: 'Collectionneur de la jungle', loot: 'legend' },
  { id: 'ti-dieu', cat: 'title', name: 'Dieu de la jungle', loot: 'mythic' },
  { id: 'fr-toxic', cat: 'frame', name: 'Toxique', loot: 'epic' },
  { id: 'fr-lava', cat: 'frame', name: 'Lave', loot: 'epic' },
  { id: 'fr-galaxy', cat: 'frame', name: 'Galaxie', loot: 'legend' },
  { id: 'fr-king', cat: 'frame', name: 'Couronne du Roi Singe', loot: 'mythic' },
  { id: 'cb-toxic', cat: 'cardback', name: 'Toxique', loot: 'rare' },
  { id: 'cb-galaxy', cat: 'cardback', name: 'Galaxie', loot: 'epic' },
  { id: 'th-galaxy', cat: 'theme', name: 'Galaxie', loot: 'legend' },
  { id: 'fx-ruby', cat: 'effect', name: 'Pluie de rubis', loot: 'epic' },
  { id: 'fx-monkey', cat: 'effect', name: 'Pluie de singes', loot: 'legend' },
];
export const LOOT_ITEMS = ITEMS.filter((i) => i.loot);
export const DEFAULTS = { frame: 'fr-none', title: 'ti-none', cardback: 'cb-classic', theme: 'th-classic', effect: 'fx-coins' };
export const PAID_ITEMS = ITEMS.filter((i) => i.price > 0 || i.loot);
const byId = (id) => ITEMS.find((i) => i.id === id);

const shopOf = (p) => (p && p.shop) || { owned: {}, eq: {} };
export const equipped = (p, cat) => { const id = shopOf(p).eq[cat]; return byId(id) && byId(id).cat === cat ? id : DEFAULTS[cat]; };
export const owns = (p, id) => { const it = byId(id); return !!it && (it.price === 0 || !!shopOf(p).owned[id]); };
export const ownedCount = (p) => Object.keys(shopOf(p).owned || {}).filter((id) => byId(id)).length;

// Classe CSS du cadre d'avatar et titre d'un joueur (utilisés partout où son avatar / pseudo apparaît)
export const frameClass = (p) => { const f = equipped(p, 'frame'); return f === 'fr-none' ? '' : f; };
export const titleHTML = (p) => { const t = equipped(p, 'title'); return t === 'ti-none' ? '' : `<span class="pl-title">${esc(byId(t).name)}</span>`; };

// Applique les cosmétiques du joueur connecté (classes sur <body> + effet de victoire)
export function applyCosmetics(wallet) {
  const b = document.body;
  [...b.classList].filter((c) => /^(cb|th)-/.test(c)).forEach((c) => b.classList.remove(c));
  b.classList.add(equipped(wallet.p, 'cardback'), equipped(wallet.p, 'theme'));
  setWinFx(equipped(wallet.p, 'effect').slice(3));
}

function previewHTML(it, wallet) {
  switch (it.cat) {
    case 'frame': return avatarHTML({ ...wallet.p, shop: { eq: { frame: it.id }, owned: {} } }, 'av-lg');
    case 'title': return `<div class="sh-title-prev"><b>${esc(wallet.pseudo)}</b>${it.id === 'ti-none' ? '<span class="pl-title muted">—</span>' : `<span class="pl-title">${esc(it.name)}</span>`}</div>`;
    case 'cardback': return `<div class="sh-cards ${it.id}"><div class="sh-card back"><div class="back-inner"></div></div><div class="sh-card back two"><div class="back-inner"></div></div></div>`;
    case 'theme': return `<div class="sh-theme ${it.id}"><div class="slot-machine mini"><div class="sh-reels"><i></i><i></i><i></i></div></div></div>`;
    case 'effect': return `<button class="btn btn-ghost btn-sm sh-try" data-fx="${it.id.slice(3)}">${icon('bolt')}Aperçu</button>`;
  }
  return '';
}

export function mount(view, { wallet }) {
  let alive = true, cat = 'frame';
  try { const c = localStorage.getItem('chibouk_shop_cat'); if (SHOP_CATS[c]) cat = c; } catch {}
  view.innerHTML = `<div class="sh-wrap">
    <div class="game-head"><h1>Bou<span>tique</span></h1></div>
    <section class="sh-top"><div><span class="muted">Ton solde</span><b id="sh-bal"></b></div><div><span class="muted">Objets possédés</span><b id="sh-owned"></b></div><div><span class="muted">Dépensé en boutique</span><b id="sh-spent"></b></div></section>
    <div class="seg sh-tabs">${Object.entries(SHOP_CATS).map(([k, c]) => `<button data-c="${k}">${icon(c.icon)}${c.name}</button>`).join('')}</div>
    <p class="muted sh-desc" id="sh-desc"></p>
    <div class="sh-grid" id="sh-grid"></div></div>`;

  function render() {
    if (!alive) return;
    $('#sh-bal', view).innerHTML = money(wallet.balance);
    $('#sh-owned', view).textContent = `${ownedCount(wallet.p)} / ${PAID_ITEMS.length}`;
    $('#sh-spent', view).innerHTML = money(wallet.stats.shopSpent || 0);
    $$('.sh-tabs button', view).forEach((b) => b.classList.toggle('on', b.dataset.c === cat));
    $('#sh-desc', view).textContent = SHOP_CATS[cat].desc;
    const eq = equipped(wallet.p, cat);
    $('#sh-grid', view).innerHTML = ITEMS.filter((i) => i.cat === cat).map((it) => {
      const own = owns(wallet.p, it.id), on = eq === it.id;
      const btn = on ? `<button class="btn btn-ghost btn-sm" disabled>${icon('check')}Équipé</button>`
        : own ? `<button class="btn btn-ghost btn-sm" data-eq="${it.id}">Équiper</button>`
          : it.loot ? `<a class="btn btn-ghost btn-sm" href="#/cases">${icon('crate')}Dans les caisses</a>`
            : `<button class="btn btn-gold btn-sm" data-buy="${it.id}" ${wallet.balance < it.price ? 'disabled' : ''}>Acheter</button>`;
      return `<div class="sh-item ${on ? 'on' : ''} ${own ? 'own' : ''} ${it.loot ? 'loot r-' + it.loot : ''}">
        <div class="sh-prev">${previewHTML(it, wallet)}</div>
        <b>${esc(it.name)}</b>
        ${bonusText(it.id, it.cat) ? `<span class="sh-bonus">${bonusText(it.id, it.cat)}</span>` : ''}
        <span class="sh-price">${it.loot ? (own ? 'Possédé · exclusif caisses' : 'Exclusif caisses') : it.price ? (own ? 'Possédé' : money(it.price)) : 'Offert'}</span>
        ${btn}</div>`;
    }).join('');
  }

  $$('.sh-tabs button', view).forEach((b) => (b.onclick = () => { cat = b.dataset.c; try { localStorage.setItem('chibouk_shop_cat', cat); } catch {} sfx.click(); render(); }));
  $('#sh-grid', view).onclick = async (e) => {
    const t = e.target.closest('[data-fx]');
    if (t) { const old = equipped(wallet.p, 'effect').slice(3); setWinFx(t.dataset.fx); coinRain(30); setWinFx(old); return; }
    const eqB = e.target.closest('[data-eq]');
    if (eqB) { equip(eqB.dataset.eq); return; }
    const buyB = e.target.closest('[data-buy]');
    if (!buyB) return;
    const it = byId(buyB.dataset.buy);
    const ok = await modal({ title: 'Confirmer l\'achat', html: `<p>Acheter <b>${esc(it.name)}</b> (${SHOP_CATS[it.cat].name.toLowerCase()}) pour ${money(it.price)} ?</p><p class="muted">Ton solde après achat : ${money(wallet.balance - it.price)}</p>`,
      buttons: [{ label: 'Annuler', value: false }, { label: 'Acheter et équiper', value: true, primary: true }] });
    if (!ok || !alive) return;
    if (owns(wallet.p, it.id) || it.loot) return;
    if (!wallet.spend(it.price, it.id)) { toast(`Pas assez de ${CUR}`, 'error'); return; }
    wallet.p.shop = { owned: { ...shopOf(wallet.p).owned, [it.id]: Date.now() }, eq: { ...shopOf(wallet.p).eq } };
    equip(it.id, true);
    sfx.win(true);
    toast(`<b>${esc(it.name)}</b> est à toi !`, 'win');
  };

  function equip(id, silent = false) {
    const it = byId(id);
    if (!it || !owns(wallet.p, id)) return;
    wallet.p.shop = { owned: { ...shopOf(wallet.p).owned }, eq: { ...shopOf(wallet.p).eq, [it.cat]: id } };
    wallet.set('shop', wallet.p.shop);
    applyCosmetics(wallet);
    wallet.emit({ type: 'profile' }); // met à jour l'avatar de l'en-tête
    if (!silent) { sfx.click(); toast(`${esc(it.name)} équipé`); }
    render();
  }

  const off = wallet.on((e) => { if (e && e.type !== 'shop') render(); });
  render();
  return () => { alive = false; off(); };
}
