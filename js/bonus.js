// Petits bonus de gains liés aux cosmétiques équipés (un seul objet équipé par catégorie).
// Chaque catégorie booste une source différente, pour varier les profils :
//   cadre → gains des mini-jeux · titre → roue du jour et quêtes · dos de cartes → rakeback
//   thème de slot → vente des bananes · effet de victoire → intérêts du coffre
// Aucune dépendance : lu par le portefeuille, la progression, la ferme et la boutique.
export const BONUS_KIND = {
  free: { cat: 'frame', label: 'gains des mini-jeux' },
  daily: { cat: 'title', label: 'roue du jour et quêtes' },
  rake: { cat: 'cardback', label: 'rakeback' },
  farm: { cat: 'theme', label: 'vente des bananes' },
  vault: { cat: 'effect', label: 'intérêts du coffre' },
};
export const CAT_KIND = Object.fromEntries(Object.entries(BONUS_KIND).map(([k, v]) => [v.cat, k]));

// % de bonus par objet (0,03 = +3 %)
export const ITEM_BONUS = {
  // cadres
  'fr-bronze': 0.01, 'fr-silver': 0.02, 'fr-gold': 0.03, 'fr-vine': 0.04, 'fr-neon': 0.05, 'fr-fire': 0.07, 'fr-rainbow': 0.1, 'fr-diamond': 0.15,
  'fr-coco': 0.02, 'fr-toxic': 0.08, 'fr-lava': 0.08, 'fr-galaxy': 0.12, 'fr-king': 0.2,
  // titres
  'ti-petit': 0.01, 'ti-banane': 0.02, 'ti-bluff': 0.03, 'ti-croupier': 0.04, 'ti-gorille': 0.05, 'ti-chasseur': 0.07, 'ti-parrain': 0.1, 'ti-legende': 0.12, 'ti-milliard': 0.15,
  'ti-curieux': 0.02, 'ti-noix': 0.03, 'ti-ouvreur': 0.06, 'ti-veinard': 0.06, 'ti-mystere': 0.09, 'ti-collec': 0.13, 'ti-dieu': 0.2,
  // dos de cartes
  'cb-blue': 0.02, 'cb-jungle': 0.04, 'cb-gold': 0.06, 'cb-neon': 0.1, 'cb-coco': 0.03, 'cb-toxic': 0.08, 'cb-galaxy': 0.12,
  // thèmes de la slot
  'th-jungle': 0.02, 'th-ocean': 0.04, 'th-royal': 0.07, 'th-neon': 0.1, 'th-galaxy': 0.15,
  // effets de victoire
  'fx-banana': 0.02, 'fx-confetti': 0.04, 'fx-stars': 0.06, 'fx-diamond': 0.1, 'fx-ruby': 0.08, 'fx-monkey': 0.15,
};

// Bonus actif d'un joueur pour une source (objet équipé et possédé)
export function cosBonus(p, kind) {
  const k = BONUS_KIND[kind];
  if (!k || !p || !p.shop || !p.shop.eq) return 0;
  const id = p.shop.eq[k.cat];
  if (!id || !ITEM_BONUS[id]) return 0;
  if (!(p.shop.owned && p.shop.owned[id])) return 0;
  return ITEM_BONUS[id];
}
export const bonusText = (id, cat) => {
  const b = ITEM_BONUS[id], kind = CAT_KIND[cat];
  return b && kind ? `+${Math.round(b * 100)} % ${BONUS_KIND[kind].label}` : '';
};
