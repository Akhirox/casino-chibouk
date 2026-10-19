// Tags spéciaux donnés à la main par un admin (panneau admin → « Tags »), affichés à côté du pseudo.
// Pour en ajouter un : une entrée ici (+ son style .tag-<id> dans css/style.css).
import { esc } from './ui.js';

export const TAGS = {
  og: { label: 'OG CHBK', desc: 'Membre historique de la jungle Chibouk' },
};
export const tagsOf = (p) => (p && Array.isArray(p.tags) ? p.tags.filter((t) => TAGS[t]) : []);
export const tagsHTML = (p) => tagsOf(p).map((t) => `<span class="pl-tag tag-${t}" title="${esc(TAGS[t].desc)}">${esc(TAGS[t].label)}</span>`).join('');
