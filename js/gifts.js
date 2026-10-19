// Cadeaux de l'admin (V29) : l'admin ajoute des cadeaux dans le profil d'un joueur (champ « gifts »), le joueur les reçoit
// au chargement suivant (rechargement automatique après une modification admin). Chaque cadeau a un id : les ids déjà
// reçus sont gardés dans loot.gd, un cadeau n'est donc jamais appliqué deux fois, même si la liste n'a pas pu être vidée.
import { applyGift } from './loot.js';
import { fmt, esc, modal, coinRain, CUR } from './ui.js';
import { sfx } from './sfx.js';

export const GIFT_KINDS = {
  br: 'Brundles',
  farm: 'Boost de récolte (ferme)',
  all: 'Boost de tous les mini-jeux',
  chal: 'Boost des défis de la jungle',
  sell: 'Boost de vente des bananes',
  spin: 'Tours de roue bonus',
};
const dur = (h) => (h >= 48 && h % 24 === 0 ? `${h / 24} jours` : `${String(h).replace('.', ',')} h`);
export function giftLabel(g) {
  if (g.kind === 'br') return `${fmt(g.amount || 0)} ${CUR}`;
  if (g.kind === 'spin') return `${g.n} tour${g.n > 1 ? 's' : ''} de roue bonus`;
  return `${GIFT_KINDS[g.kind] || g.kind} ×${String(g.m).replace('.', ',')} pendant ${dur(g.h)}`;
}

export async function receiveGifts(wallet, backend) {
  const list = Array.isArray(wallet.p.gifts) ? wallet.p.gifts.filter((g) => g && g.id) : [];
  if (!list.length) return;
  const l = (wallet.p.loot = wallet.p.loot && typeof wallet.p.loot === 'object' ? wallet.p.loot : { boosts: [], perm: 0 });
  const done = new Set(Array.isArray(l.gd) ? l.gd : []);
  const got = [];
  for (const g of list) {
    if (done.has(g.id)) continue;
    try { if (applyGift(wallet, g)) got.push(g); } catch (e) { console.error('Cadeau', e); }
    done.add(g.id);
  }
  l.gd = [...done].slice(-60);
  wallet.p.gifts = [];
  if (got.length) {
    wallet.flush && wallet.flush();
    const msgs = [...new Set(got.map((g) => g.msg).filter(Boolean))];
    sfx.bonus(); coinRain(40);
    modal({ title: 'Un cadeau pour toi !', html: `<div class="gift-pop">${msgs.length ? `<p class="gift-msg">« ${msgs.map(esc).join(' » « ')} »</p>` : ''}<ul>${got.map((g) => `<li>${esc(giftLabel(g))}</li>`).join('')}</ul><p class="muted">De la part de l'équipe du Casino Chibouk.</p></div>`, buttons: [{ label: 'Merci !', value: true, primary: true }] });
  }
  try { if (backend.clearGifts) await backend.clearGifts(wallet.uid); } catch (e) { console.warn('Cadeaux : liste non vidée (sans gravité)', e); }
}
