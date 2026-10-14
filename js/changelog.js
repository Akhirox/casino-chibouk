// Journal des versions (page « Nouveautés » + fenêtre affichée une fois après une mise à jour)
import { $, modal, esc } from './ui.js';

export const VERSION = '11';

export const CHANGELOG = [
  {
    v: '11', date: '14 octobre 2026', title: 'Rakeback en continu, nouveaux rangs VIP et chiffres du casino',
    groups: [
      ['Rangs VIP', [
        '11 rangs au lieu de 7, avec deux nouveaux tout en haut : Gorille argenté (2,5 milliards misés) et Roi Singe (10 milliards). Les rangs élevés demandent plus de mises qu\'avant.',
        'Bonus de passage : chaque nouveau rang rapporte une prime en Brundles, de +500 (Tamarin) à +100 millions (Roi Singe). Si tu as déjà des rangs, leurs bonus te sont versés une fois à ta prochaine connexion.',
        'Rakeback en continu : le remboursement du lundi est remplacé par une cagnotte. De 0,1 % à 1,35 % de chaque mise aux jeux de casino (gagnée ou perdue) y tombe, et tu la récupères quand tu veux depuis l\'accueil ou la fenêtre des rangs VIP.',
      ]],
      ['Nouveautés', [
        'Nouvelle page Classements, séparée de Stats : classement de la semaine et palmarès, classement des soldes, meilleurs gains par jeu.',
        'Le Casino Chibouk en chiffres : total misé et gagné par tout le monde, RTP réel du casino, Brundles distribués gratuitement (roue, quiz, succès, rakeback…), dépenses en boutique, plus gros gain de l\'histoire, et un tableau par jeu (volume, RTP, nombre de joueurs, plus gros parieur).',
        'La page Stats ne montre plus que tes stats à toi.',
        'Le titre « Légende de Chibouk » s\'appelle maintenant « Légende de la Chibouk ».',
      ]],
      ['En direct de la jungle', [
        'Les tours gratuits de la slot n\'y apparaissent plus.',
        'Les gros gains y apparaissent à partir de ×25.',
        'Les passages de rang VIP affichent le bonus touché.',
      ]],
      ['Correctifs', [
        'La description d\'un succès au survol reste dans le cadre du fil et passe à la ligne.',
      ]],
    ],
  },
  {
    v: '10', date: '14 octobre 2026', title: 'Correctifs, Tower auto sur mesure et rangs VIP détaillés',
    groups: [
      ['Nouveautés', [
        'Tower : l\'auto suit le parcours que tu traces en cliquant sur les cases du plateau (étage par étage), avec « Jusqu\'en haut » et « Parcours au hasard ». Les cases se découvrent rapidement l\'une après l\'autre.',
        'Calcul mental : 3 modes. Facile (10 s, +10 par bonne réponse), Moyen (12 s, +15) et Difficile (15 s, +25 : multiplications à deux chiffres, carrés, pourcentages…).',
        'Jackpot : ta chance de le remporter avec ta mise actuelle est affichée au-dessus des rouleaux et sur l\'accueil (clic pour le détail du calcul).',
        'Rangs VIP : clic sur n\'importe quel rang pour voir le tableau de tous les rangs et leurs avantages. Nouveaux avantages : bonus sur la roue du jour (jusqu\'à +50 %) et sur les quêtes (jusqu\'à +50 %). Le pourcentage de progression vers le rang suivant est affiché.',
        'Succès : menu « Trier » (mes derniers obtenus, derniers obtenus par tout le monde, les plus rares, les plus courants) et pourcentage de joueurs qui ont chaque succès.',
        'Fiche des joueurs : « En ligne » ou « Dernière connexion il y a… » (minutes, heures, jours, semaines…).',
        'Fil d\'activité : liens vers le jeu concerné, fiche du joueur au clic sur son pseudo, et description du succès au survol.',
        'Nouveau succès Or : sans-faute au calcul mental en mode difficile.',
        'En direct de la jungle : beaucoup plus de choses y apparaissent. Tous les succès (regroupés quand plusieurs tombent ensemble), les gains à partir de ×15 (ou ×4 dès 5 000 Brundles), les tours gratuits de la slot, les sans-faute aux quiz, les belles séries au Plus ou moins, les grosses roues du jour, les remboursements VIP, tous les achats en boutique, les passages de rang VIP et les quêtes du jour terminées.',
      ]],
      ['Correctifs', [
        'Les onglets du classement à côté des jeux ne dépassent plus du cadre.',
        'Un même événement ne s\'affiche plus deux fois dans « En direct de la jungle ».',
      ]],
    ],
  },
  {
    v: '9', date: '14 octobre 2026', title: 'Boutique, jackpot commun, quêtes et 7 nouveaux jeux',
    groups: [
      ['Nouveaux jeux de casino', [
        'Hi-Lo : la carte suivante sera-t-elle plus haute ou plus basse ? Chaque bonne réponse fait grimper le multiplicateur, encaisse quand tu veux (flèches du clavier pour jouer).',
        'Keno : choisis de 1 à 10 numéros sur 40, 10 sont tirés. 3 niveaux de risque, jusqu\'à ×10 000, tableau des gains avec les probabilités.',
        'Roue du Singe : 30 cases et 3 niveaux de risque, des petits gains fréquents jusqu\'à une case unique à ×29,7.',
        'Limbo : choisis un multiplicateur cible, si le tirage l\'atteint tu gagnes mise × cible (de ×1,01 à ×1 000 000).',
        'Les 4 ont un RTP de 99 %, les paris automatiques, leur classement et leurs succès.',
      ]],
      ['Nouveaux jeux gratuits', [
        'Mot du jour : façon Motus, le même mot pour tout le monde, 6 essais, première lettre donnée. Jusqu\'à +400 Brundles, et un bouton pour copier ta grille sans révéler le mot.',
        'Quiz drapeaux : 159 pays, mode facile (4 choix, souvent des voisins aux drapeaux proches) ou expert (à écrire, gains doublés).',
        'Plus ou moins : quel film a eu le plus gros budget ? Série jusqu\'à 15, +10 Brundles par bonne réponse.',
      ]],
      ['Progression', [
        'Roue du jour : le bonus quotidien devient une roue (500 à 5 000 Brundles), multipliée par ta série de jours consécutifs (+10 % par jour, jusqu\'à ×2).',
        'Quêtes du jour : 3 missions (facile, moyenne, difficile) renouvelées à minuit, de +300 à +1 000 Brundles, +500 si les 3 sont faites.',
        'Rangs VIP selon le total misé (Ouistiti → Roi Singe) : chaque lundi, 1 à 7 % de tes pertes de la semaine aux jeux de casino te sont remboursées.',
        'Classement de la semaine (bénéfice du lundi au dimanche) sur la page Stats, avec un trophée permanent pour le vainqueur et un palmarès.',
      ]],
      ['Boutique et social', [
        'Boutique : cadres d\'avatar (dont des animés), titres sous ton pseudo, dos de cartes, thèmes de la Chibouk Slot et effets de victoire. De 2 000 à 100 millions de Brundles.',
        'Jackpot commun : 1 % de chaque mise à la Chibouk Slot l\'alimente (payé par le casino), il peut tomber sur n\'importe quel spin, plus souvent avec une grosse mise.',
        'En direct de la jungle : le fil d\'activité de l\'accueil montre les gros gains, les succès rares, les jackpots, les rangs VIP et les vainqueurs de la semaine.',
        'Historique de tes 50 dernières parties dans l\'onglet « Historique » du classement à côté de chaque jeu.',
      ]],
      ['Changements', [
        'Nouveau menu : Accueil, Casino ▾, Gratuit ▾, Boutique, Succès, Stats. Les jeux sont rangés dans les menus déroulants.',
        'Accueil : jackpot, quêtes et rang VIP en haut de page, puis le fil d\'activité (repliable comme les catégories).',
        '38 nouveaux succès (115 au total), dont une catégorie Progression.',
        'Les notifications sont limitées à 4 à l\'écran.',
      ]],
    ],
  },
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
