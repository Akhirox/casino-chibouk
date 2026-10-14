// Journal des versions (page « Nouveautés » + fenêtre affichée une fois après une mise à jour)
import { $, modal, esc } from './ui.js';

export const VERSION = '8';

export const CHANGELOG = [
  {
    v: '8', date: '14 octobre 2026', title: 'Nouvelle slot, profils et singe conseiller',
    groups: [
      ['Chibouk Slot', [
        '99 lignes au lieu de 21 : toutes les lignes où chaque symbole touche le suivant, en face ou en diagonale, jamais 2 rangées d\'écart. Elles sont toutes dessinées dans la table des gains.',
        'On choisit maintenant la mise totale du spin (10 minimum), répartie sur les 99 lignes. Les gains de toutes les lignes s\'additionnent.',
        'Nouveau symbole SCATTER (le Totem) : il paie n\'importe où (×2, ×10 ou ×50 la mise) et c\'est lui qui déclenche les tours gratuits ×2 (3, 4 ou 5 Totems = 10, 15 ou 20 tours).',
        'Le WILD remplace simplement n\'importe quel symbole (sauf le SCATTER) et ne déclenche plus le bonus.',
        'Nouveau WILD ×2 (le Roi Singe violet), plus rare et seulement sur les rouleaux 2 à 4 : il double le gain de sa ligne (×4 avec deux).',
        'Animation des gros gains dès ×10 la mise : le multiplicateur du spin monte en direct, avec 4 paliers (Gros gain, Super gain, Méga gain, Gain énorme). Clic ou Espace pour passer.',
        'Le multiplicateur de chaque spin gagnant s\'affiche sous le gain. RTP calculé exactement : 100,1 %.',
      ]],
      ['Nouveautés', [
        'Quiz capitales : deux modes. Facile avec 4 propositions, ou Expert où il faut écrire la réponse (accents et petites fautes tolérés), 15 s par question et gains doublés (+20 par bonne réponse, +100 pour un sans-faute).',
        'Profils : photo de profil (ta photo ou un des 12 singes), petite bio, et page « Mon profil » dans le menu de ton pseudo.',
        'Clique sur un pseudo dans un classement pour voir la fiche du joueur : photo, bio, solde, jeu préféré et meilleurs succès.',
        'Le singe conseiller : de temps en temps, un petit singe donne une astuce sur la page où tu es (succès, profil, paris auto, raccourcis clavier…). On peut le faire taire ou lui demander un conseil depuis le menu de ton pseudo.',
        '5 nouveaux succès : Carte de visite, Allée des totems, Double double, Gain énorme et Géographe de compétition.',
      ]],
      ['Changements', [
        'Accueil : texte d\'accueil raccourci, et les catégories « Jeux de casino » et « Gagner des Brundles gratuitement » se replient d\'un clic sur leur titre (ton choix est mémorisé).',
        'Les avatars des joueurs apparaissent dans les classements et dans la liste des succès.',
      ]],
    ],
  },
  {
    v: '7', date: '14 octobre 2026', title: 'Quiz capitales, quiz ciné et succès cliquables',
    groups: [
      ['Nouveautés', [
        'Quiz capitales : nouveau jeu gratuit, 10 questions dans les deux sens (trouve la capitale d\'un pays, ou le pays d\'une capitale) parmi 127 pays, 10 secondes par question, de plus en plus difficile.',
        'Quiz ciné : nouveau jeu gratuit sur les 800 films les plus populaires de la base TMDB. Qui a réalisé ce film ? Qui joue dedans ? En quelle année est-il sorti ? 15 secondes par question, affiche du film dévoilée après chaque réponse.',
        'Même barème que le calcul mental pour les deux quiz : +10 Brundles par bonne réponse, +50 pour un sans-faute. Réponses au clic ou au clavier (touches 1 à 4 ou A à D).',
        'Succès cliquables : chaque succès affiche la liste des joueurs qui l\'ont débloqué avec la date, et met en avant le premier à l\'avoir obtenu.',
        'Chaque carte de succès indique combien de joueurs l\'ont débloqué, avec une coupe si tu as été le premier.',
        '4 nouveaux succès Argent : sans-faute et 100 bonnes réponses aux quiz capitales et ciné.',
      ]],
      ['Changements', [
        'Page Stats : cartes dédiées aux quiz capitales et ciné.',
      ]],
    ],
  },
  {
    v: '6', date: '14 octobre 2026', title: 'Succès, paris automatiques et nouvel accueil',
    groups: [
      ['Nouveautés', [
        '68 succès à débloquer : défis globaux (atteindre 10 000, 100 000, 1 000 000 et 10 000 000 de Brundles, perdre 10 parties d\'affilée, jouer entre 3 h et 5 h du matin…) et défis par jeu (perdre 5 mains de blackjack d\'affilée, voir 5 WILD, encaisser à ×100 au Crashibouk, gagner aux Mines avec 24 mines…).',
        'Chaque succès rapporte des Brundles selon son niveau : Bronze +100, Argent +500, Or +2 500, Légende +10 000. Notification à chaque déblocage et page « Succès » dans le menu.',
        'Paris automatiques sur les 8 jeux de casino : nombre de paris libre (vide = à l\'infini), arrêt automatique sur objectif de gain ou limite de perte, bilan en direct.',
        'Blackjack automatique : rejoue tes mises et joue chaque main avec la stratégie de base (tirer, rester, doubler, séparer).',
        'Tower et Mines automatiques : tu choisis combien d\'étages grimper ou de bananes révéler avant d\'encaisser.',
        'Page « Nouveautés » (ce journal), accessible depuis le menu de ton pseudo et le bas de page.',
      ]],
      ['Changements', [
        'Blackjack : nouvelle prise de mise. Choisis un jeton, puis clique directement sur MISE, PAIRES ou 21+3 sur le tapis. La croix (ou le clic droit) retire la mise d\'une case. « Remiser » et « ×2 » s\'appliquent aussi aux mises annexes.',
        'Accueil réorganisé en deux catégories : « Jeux de casino » et « Gagner des Brundles gratuitement » (bonus quotidien, calcul mental, casse-briques). Le menu suit le même ordre.',
        'Les boutons 10 / 25 / 50 des séries automatiques sont remplacés par le nouveau mode automatique.',
        'Classement : nombre de succès affiché pour chaque joueur.',
      ]],
    ],
  },
  {
    v: '5', date: '13 octobre 2026', title: 'Mises annexes, calcul mental et classements par jeu',
    groups: [
      ['Nouveautés', [
        'Blackjack : mises annexes Perfect Pairs (paire mixte 6:1, de couleur 15:1, parfaite 25:1) et 21+3 (couleur 5:1, suite 11:1, brelan 30:1, quinte flush 45:1, brelan couleur 100:1), avec un RTP d\'environ 99,5 %.',
        'Calcul mental : nouveau jeu gratuit, 10 calculs de 10 secondes chacun, +10 Brundles par bonne réponse et +50 pour un sans-faute.',
        'Classement à côté de chaque jeu : plus gros parieurs (volume), meilleur multiplicateur et plus gros gain, top 5.',
        'Le meilleur multiplicateur de chaque jeu est maintenant enregistré et visible dans les stats.',
      ]],
      ['Changements', [
        'Blackjack : on peut séparer n\'importe quelles deux cartes (jusqu\'à 4 mains).',
        'Message d\'erreur plus clair si l\'envoi de Brundles est refusé par Firebase.',
      ]],
    ],
  },
  {
    v: '4', date: '13 octobre 2026', title: 'Suivi de session, transferts et meilleures wins',
    groups: [['Nouveautés', [
      'Suivi de session en graphique (vert/rouge), qui survit aux changements de jeu.',
      'Envoi de Brundles entre joueurs.',
      'Classement des meilleures wins par jeu sur la page Stats.',
    ]]],
  },
  {
    v: '3', date: '13 octobre 2026', title: 'Tower, Mines et Dice',
    groups: [['Nouveautés', [
      'Nouveaux jeux : Tower, Mines et Dice.',
      'Renommages : Chibouk Slot, Plinkoko, Crashibouk. RTP de la slot ramené à ≈ 100 %.',
    ]]],
  },
  {
    v: '2', date: '13 octobre 2026', title: 'Plinkoko, Crashibouk et icônes maison',
    groups: [['Nouveautés', [
      'Nouveaux jeux : Plinkoko et Crashibouk.',
      'Plus aucune mise maximum, icônes SVG maison à la place des emojis, casse-briques accessible à tout moment.',
    ]]],
  },
  {
    v: '1', date: '13 octobre 2026', title: 'Ouverture du Casino Chibouk',
    groups: [['Nouveautés', ['Machine à sous, blackjack, roulette, casse-briques, bonus quotidien, stats et classement.']]],
  },
];

function versionHTML(c) {
  return `<article class="cl-item"><header><span class="cl-v">V${c.v}</span><div><h2>${esc(c.title)}</h2><small>${c.date}</small></div></header>
    ${c.groups.map(([t, items]) => `<h3>${t}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}</article>`;
}

export function mount(view) {
  view.innerHTML = `<div class="cl-wrap"><div class="game-head"><h1>Nouveau<span>tés</span></h1></div>${CHANGELOG.map(versionHTML).join('')}</div>`;
  try { localStorage.setItem('chibouk_seen_version', VERSION); } catch {}
}

// Fenêtre « Quoi de neuf » affichée une seule fois après une mise à jour
export async function maybeShowNews() {
  let seen = null;
  try { seen = localStorage.getItem('chibouk_seen_version'); } catch {}
  if (seen === VERSION) return;
  try { localStorage.setItem('chibouk_seen_version', VERSION); } catch {}
  const c = CHANGELOG[0];
  const go = await modal({ title: `Quoi de neuf dans la V${c.v} ?`, cls: 'wide', html: `<div class="cl-pop">${versionHTML(c)}</div>`,
    buttons: [{ label: 'Tout l\'historique', value: 'all' }, { label: 'C\'est parti !', value: true, primary: true }] });
  if (go === 'all') location.hash = '#/news';
}
