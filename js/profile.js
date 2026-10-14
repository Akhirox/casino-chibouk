// Profil joueur : photo (ou singe prédéfini) + petite bio, page « Mon profil » et fiche des autres joueurs
import { CONFIG } from './config.js';
import { monkeySVG, icon } from './art.js';
import { $, $$, fmt, money, esc, toast, modal, CUR } from './ui.js';
import { getPlayers } from './players.js';
import { ACHIEVEMENTS, TIERS } from './achievements.js';
import { frameClass, titleHTML } from './shop.js';
import { vipBadge } from './progress.js';

export const BIO_MAX = 160;
const AVATAR_MAX_CHARS = 38000; // photo en JPEG base64 (≈ 28 Ko), stockée directement dans Firestore

// Singes prédéfinis : [options du singe, couleur de fond]
export const PRESETS = [
  [{}, '#2f7a35'],
  [{ wink: true }, '#1f5e8c'],
  [{ cap: true }, '#8c3a1f'],
  [{ crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' }, '#4a2a7a'],
  [{ flower: true, fur: '#b35c8a', face: '#ffd9ea', ear: '#ffb3d1' }, '#2a6b5e'],
  [{ fur: '#3b3b3b', face: '#d9c2a5', ear: '#bfa080' }, '#7a1f2f'],
  [{ fur: '#7b3fd1', face: '#f1dcff', ear: '#c9a0ff', crown: true }, '#14324a'],
  [{ fur: '#d9d9d9', face: '#fff4e6', ear: '#f2d9c4', wink: true }, '#3b4a1f'],
  [{ fur: '#c2410c', face: '#ffe1c2', ear: '#ffbe8a', cap: true }, '#103a2a'],
  [{ fur: '#2563eb', face: '#dbeafe', ear: '#93c5fd' }, '#5a3a0a'],
  [{ fur: '#15803d', face: '#dcfce7', ear: '#86efac', flower: true }, '#3a1440'],
  [{ fur: '#111', face: '#f5c542', ear: '#c98a00', crown: true, wink: true }, '#5e0f0f'],
];

const hash = (s) => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

// Avatar d'un joueur (photo, singe choisi, ou singe attribué d'après le pseudo)
export function avatarHTML(p, cls = '') {
  const a = (p && p.avatar) || '';
  let inner;
  if (a.startsWith('data:image/')) inner = `<span class="av ${cls}"><img src="${esc(a)}" alt=""></span>`;
  else {
    let i = a.startsWith('m:') ? +a.slice(2) : hash(p && p.pseudo) % PRESETS.length;
    if (!PRESETS[i]) i = 0;
    const [o, bg] = PRESETS[i];
    inner = `<span class="av ${cls}" style="--av-bg:${bg}">${monkeySVG(o)}</span>`;
  }
  // cadre acheté en boutique
  const f = p && p.shop ? frameClass(p) : '';
  return f ? `<span class="avf ${f}">${inner}</span>` : inner;
}

// Recadre une image au centre et la réduit en 160×160 JPEG
export async function resizeImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Choisis un fichier image (JPG, PNG, WebP…)');
  if (file.size > 15 * 1024 * 1024) throw new Error('Image trop lourde (15 Mo max)');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Image illisible')); im.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
    for (const [size, q] of [[160, 0.85], [128, 0.8], [112, 0.7], [96, 0.6]]) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      const data = c.toDataURL('image/jpeg', q);
      if (data.length <= AVATAR_MAX_CHARS) return data;
    }
    throw new Error('Image trop complexe, essaie une autre photo');
  } finally { URL.revokeObjectURL(url); }
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const GAME_NAMES = { slots: 'Chibouk Slot', blackjack: 'Blackjack', roulette: 'Roulette', plinko: 'Plinkoko', crash: 'Crashibouk', tower: 'Tower', mines: 'Mines', dice: 'Dice', hilo: 'Hi-Lo', keno: 'Keno', wheel: 'Roue du Singe', limbo: 'Limbo' };

// Trophées de la semaine (palmarès chargé par weekly.js)
let WEEKS = [];
export function setWeeks(list) { WEEKS = list || []; }
function trophies(p) {
  const n = WEEKS.filter((w) => w.winnerUid === p.uid).length;
  return n ? `<span class="trophy-badge" title="Vainqueur du classement de la semaine">${icon('trophy')}×${n}</span>` : '';
}

// Carte de profil (sert sur la page « Mon profil » et dans la fiche des autres joueurs)
export function cardHTML(p, { me = false } = {}) {
  const s = p.stats || {};
  const games = s.games || {};
  const fav = Object.entries(games).sort((a, b) => (b[1].rounds || 0) - (a[1].rounds || 0))[0];
  const u = (p.ach && p.ach.u) || {};
  const nAch = Object.keys(u).length;
  const best = ACHIEVEMENTS.filter((a) => u[a.id]).sort((a, b) => Object.keys(TIERS).indexOf(b.tier) - Object.keys(TIERS).indexOf(a.tier) || u[a.id] - u[b.id]).slice(0, 3);
  return `<div class="pf-card">
    <div class="pf-top">${avatarHTML(p, 'av-xl')}
      <div class="pf-id"><h2>${esc(p.pseudo)}${me ? ' <small>(toi)</small>' : ''}</h2>
        <div class="pf-badges">${vipBadge(p)}${titleHTML(p)}${trophies(p)}</div>
        ${p.createdAt ? `<small class="muted">Membre depuis le ${dateFmt.format(new Date(p.createdAt))}</small>` : ''}
        <p class="pf-bio ${p.bio ? '' : 'empty'}">${p.bio ? esc(p.bio) : me ? 'Pas encore de bio. Présente-toi en dessous !' : 'Ce singe n\'a rien écrit pour l\'instant.'}</p></div></div>
    <div class="pf-stats">
      <div><span>Solde</span><b>${money(p.balance)}</b></div>
      <div><span>Total misé</span><b>${fmt(s.totalWagered)}</b></div>
      <div><span>Plus gros gain</span><b>${fmt(s.biggestWin)}</b></div>
      <div><span>Succès</span><b>${nAch}/${ACHIEVEMENTS.length}</b></div>
      <div><span>Jeu préféré</span><b>${fav && fav[1].rounds ? GAME_NAMES[fav[0]] : '—'}</b></div>
    </div>
    ${best.length ? `<div class="pf-ach">${best.map((a) => `<span class="tier-badge t-${a.tier}" title="${esc(a.desc)}">${icon('medal')} ${esc(a.name)}</span>`).join('')}</div>` : ''}
  </div>`;
}

// Fiche d'un autre joueur (clic sur un pseudo dans les classements)
export async function showPlayerCard(uid, { backend, wallet }) {
  let p = null;
  try { p = (await getPlayers(backend, wallet)).find((x) => x.uid === uid); } catch (e) { console.error(e); }
  if (!p) { toast('Profil introuvable pour le moment', 'error'); return; }
  const me = uid === wallet.uid;
  const r = await modal({ title: me ? 'Ton profil' : 'Profil', cls: 'pf-modal', html: cardHTML(me ? { ...p, avatar: wallet.p.avatar, bio: wallet.p.bio, shop: wallet.p.shop } : p, { me }),
    buttons: me ? [{ label: 'Modifier', value: 'edit' }, { label: 'Fermer', value: true, primary: true }] : [{ label: 'Fermer', value: true, primary: true }] });
  if (r === 'edit') location.hash = '#/profile';
}

// Clic sur n'importe quel élément [data-player] => fiche du joueur
export function initPlayerCards(ctx) {
  const onClick = (e) => {
    const el = e.target.closest('[data-player]');
    if (!el || e.target.closest('.modal') || !ctx.wallet) return;
    e.preventDefault();
    showPlayerCard(el.dataset.player, ctx);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

// Page « Mon profil »
export function mount(view, { wallet }) {
  let alive = true;
  let avatar = wallet.p.avatar || '';
  let bio = wallet.p.bio || '';
  const me = () => ({ ...wallet.p, uid: wallet.uid, avatar, bio, stats: wallet.stats });

  view.innerHTML = `<div class="pf-wrap">
    <div class="game-head"><h1>Mon <span>profil</span></h1></div>
    <section class="pf-preview" id="pf-preview"></section>
    <section class="pf-edit">
      <h3>Photo de profil</h3>
      <div class="pf-avatars">
        <label class="pf-upload" title="Importer une photo">${icon('camera')}<span>Ta photo</span><input type="file" accept="image/*" id="pf-file" hidden></label>
        ${PRESETS.map((_, i) => `<button type="button" class="pf-av" data-av="m:${i}" aria-label="Singe ${i + 1}">${avatarHTML({ avatar: 'm:' + i })}</button>`).join('')}
      </div>
      <p class="muted pf-hint">La photo est recadrée en carré et réduite (quelques Ko) avant d'être enregistrée.</p>
      <h3>Bio</h3>
      <textarea id="pf-bio" maxlength="${BIO_MAX}" rows="3" placeholder="Ex : Roi du blackjack, allergique aux bananes vertes."></textarea>
      <div class="pf-actions"><small class="muted" id="pf-count"></small><button class="btn btn-gold" id="pf-save">Enregistrer</button></div>
    </section></div>`;

  const ta = $('#pf-bio', view);
  ta.value = bio;
  const render = () => {
    if (!alive) return;
    $('#pf-preview', view).innerHTML = cardHTML(me(), { me: true });
    $$('.pf-av', view).forEach((b) => b.classList.toggle('on', b.dataset.av === avatar));
    $('.pf-upload', view).classList.toggle('on', avatar.startsWith('data:'));
    $('#pf-count', view).textContent = `${ta.value.length}/${BIO_MAX}`;
    const dirty = avatar !== (wallet.p.avatar || '') || ta.value.trim() !== (wallet.p.bio || '');
    $('#pf-save', view).disabled = !dirty;
  };
  ta.oninput = () => { bio = ta.value; render(); };
  $$('.pf-av', view).forEach((b) => (b.onclick = () => { avatar = b.dataset.av; render(); }));
  $('#pf-file', view).onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { avatar = await resizeImage(f); render(); } catch (err) { toast(err.message, 'error'); }
  };
  $('#pf-save', view).onclick = async () => {
    const btn = $('#pf-save', view);
    btn.disabled = true; btn.textContent = 'Enregistrement…';
    try {
      await wallet.saveCard({ avatar, bio: ta.value.trim() });
      toast('Profil enregistré !', 'win');
    } catch (err) {
      console.error(err);
      toast(/permission/i.test(err.message || err.code || '') ? 'Refusé par Firebase : publie la dernière version de firestore.rules.' : 'Enregistrement impossible, réessaie.', 'error', 6000);
    }
    if (!alive) return;
    btn.textContent = 'Enregistrer';
    render();
  };
  render();
  return () => { alive = false; };
}
