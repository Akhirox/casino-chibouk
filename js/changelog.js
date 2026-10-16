// Journal des versions (page « Nouveautés » + fenêtre affichée une fois après une mise à jour)
import { $, modal, esc } from './ui.js';

export const VERSION = '18.1';

export const CHANGELOG = [
  {
    v: '18.1', date: '16 octobre 2026', title: 'Mises à jour automatiques',
    groups: [['Nouveau', [
      'Quand une nouvelle version du casino est publiée pendant que tu joues, un bandeau te prévient. La mise à jour s\'installe toute seule au prochain changement de page (ou tout de suite avec le bouton), après avoir encaissé ta partie en cours et sauvegardé ton profil.',
    ]]],
  },
  {
    v: '18', date: '16 octobre 2026', title: 'Auto plus malin et réglage du volume',
    groups: [
      ['Paris automatiques', [
        'Nouvelle option « Solde min. » : l\'auto s\'arrête dès que ton solde passe sous le montant choisi.',
        'Nouvelle option « En cas de perte » : la mise augmente ou baisse du pourcentage de ton choix après chaque partie perdue, et revient à sa valeur de départ après une victoire (et à la fin de l\'auto). Disponible sur tous les jeux à mise unique : slot, Plinkoko, Crash, Tower, Mines, Dice, Hi-Lo, Keno, Roue et Limbo.',
      ]],
      ['Son', [
        'Le bouton haut-parleur ouvre un curseur de volume (avec « Couper le son »). Sur téléphone, le curseur est dans le menu du pseudo. Le réglage est gardé sur l\'appareil.',
      ]],
    ],
  },
  {
    v: '17', date: '16 octobre 2026', title: 'Menu rangé, nouvelle Chibouk Slot et plein de contenu',
    groups: [
      ['Navigation', [
        'Le menu est regroupé : Accueil, puis Casino, Mini-jeux et Ferme, puis Boutique, Succès, Classements et Stats.',
        '« Gratuit » devient « Mini-jeux », rangés en trois familles : Puzzle, Quiz et Adresse (dans le menu et sur l\'accueil).',
        'La ferme s\'ouvre toujours sur ta propre ferme, même si tu étais chez les voisins la dernière fois.',
      ]],
      ['Chibouk Slot', [
        'Le résultat de chaque spin s\'affiche en grand, au centre sous les rouleaux.',
        'Nouveaux boutons ½ et ×2 pour diviser ou doubler la mise.',
        'Les spins automatiques sont maintenant à droite du bouton SPIN, avec l\'interrupteur Turbo juste à côté.',
      ]],
      ['Contenu', [
        'Pinpoint : 335 nouvelles catégories (570 au total).',
        'Mots croisés : plus de 600 nouveaux mots (900 au total), et les mots de tes 25 dernières grilles sont évités.',
        'Tickets à gratter : chaque montant a sa couleur pour repérer les trios d\'un coup d\'œil.',
        'Ferme : en sélectionnant un puits, tu vois combien de bananes par heure il rapporte déjà et combien son amélioration ajoutera, selon ce qui est construit autour.',
      ]],
      ['Correctifs', [
        'Plinkoko : avec de toutes petites mises, l\'arrondi du gain faussait le RTP (jusqu\'à 110 % avec une mise de 1). Le gain est maintenant arrondi au hasard, au Brundle supérieur ou inférieur, et chaque mode reste à 99 %.',
        'Fil « En direct de la jungle » : le bouton Voir plus / Voir moins ne répondait plus après quelques allers-retours sur l\'accueil.',
        'Sur petit téléphone, la barre du haut dépassait de l\'écran depuis l\'ajout du coffre.',
      ]],
    ],
  },
  {
    v: '16', date: '16 octobre 2026', title: 'Coffre-fort, jeux à gratter, Memory et mots croisés',
    groups: [
      ['Coffre-fort', [
        'Nouveau bouton coffre dans la barre du haut (et dans le menu du pseudo) : mets des Brundles à l\'abri pour ne pas les perdre au casino. Dépôt et retrait libres, sans frais, à tout moment.',
        'Le contenu du coffre compte dans ta fortune : classement et succès de solde se basent sur solde + coffre.',
      ]],
      ['Nouveaux jeux', [
        'Jeux à gratter (casino) : 3 tickets, Banane Express à 10, Singe d\'Or à 100 et Trésor de la Jungle à 1 000, jusqu\'à ×10 000. 3 montants identiques = gagné. Gratte à la souris ou au doigt, clique sur une case pour l\'ouvrir d\'un coup, « Tout gratter », ou lance les tickets automatiques. RTP 98 %.',
        'Memory (gratuit) : retrouve les paires en 4×4, 6×4 ou 6×6. +30 à +100, et +50 % si tu fais peu d\'erreurs.',
        'Mots croisés (gratuit) : une nouvelle grille à chaque partie, 7, 10 ou 14 mots. +40 à +110, chaque lettre révélée coûte 10 % du gain.',
        '11 nouveaux succès (catégorie Jeux à gratter, Memory, mots croisés) et 3 nouvelles quêtes.',
      ]],
      ['Crashibouk', [
        'Une fois ta mise encaissée, la fusée passe en avance rapide jusqu\'à l\'explosion : plus besoin d\'attendre pour relancer.',
      ]],
    ],
  },
  {
    v: '15.2', date: '15 octobre 2026', title: 'Fil d\'activité plus lisible, Plinkoko en arrière-plan',
    groups: [
      ['En direct de la jungle', [
        'Les messages semblables d\'un même joueur sont regroupés en une seule ligne (même jeu, à moins de 6 h d\'écart), avec un compteur « +18 » à cliquer pour voir le détail. Les succès débloqués d\'affilée sont fusionnés, et pour les gros gains c\'est le plus gros qui s\'affiche.',
        'Queens, Tango, Sudoku, Démineur et Snake n\'y apparaissent plus que pour un nouveau record personnel.',
      ]],
      ['Correctifs', [
        'Plinkoko : dans un onglet en arrière-plan (où l\'animation est en pause), les gains n\'étaient pas comptés tant que les noix n\'étaient pas tombées, et ils étaient perdus si on fermait l\'onglet. Le gain est désormais enregistré dès le lâcher, et les noix tombent immédiatement quand l\'onglet passe en arrière-plan.',
      ]],
    ],
  },
  {
    v: '15.1', date: '15 octobre 2026', title: 'Pinpoint rééquilibré',
    groups: [['Équilibrage', ['Pinpoint rapporte 60 % de moins : +40 au premier indice, puis +28 / +20 / +12 / +6.']]],
  },
  {
    v: '15', date: '15 octobre 2026', title: 'Graines d\'or et achat de bananes',
    groups: [
      ['Ferme à bananes', [
        'Le marché permet maintenant d\'acheter des bananes : 1 Brundle la banane, soit 10 fois le prix de vente. Pratique pour se débloquer, mais ça ne remplace pas le travail des singes.',
        'Graines d\'or : après 1 million de bananes récoltées, tu peux replanter ta ferme. Bâtiments, singes et bananes repartent de zéro, mais tu gardes tes parcelles et tes bâtisseurs, et chaque graine donne +5 % de production pour toujours. Plus tu récoltes avant de replanter, plus tu gagnes de graines.',
        'Après une replantation, tu repars avec des bâtiments de plus en plus grands selon tes graines.',
        'Niveaux maximum relevés : bananeraie 15 (avec plus de places pour les singes), cabane 12, entrepôt 12, puits 6.',
        '4 nouveaux succès (Replanteur, Main verte, Dynastie bananière, Bananeraie mythique), et les replantations apparaissent dans « En direct de la jungle ».',
      ]],
      ['Correctifs', [
        'Queens : les cases ne changent plus de taille quand on pose une couronne ou une croix (même correction par précaution sur Tango, Sudoku et la ferme).',
      ]],
    ],
  },
  {
    v: '14', date: '15 octobre 2026', title: 'La ferme à bananes',
    groups: [
      ['Nouveau : la ferme à bananes', [
        'Ta propre ferme sur un terrain de 7 × 7 : des singes ouvriers récoltent des bananes dans tes bananeraies, même quand tu n\'es pas connecté.',
        'Cinq bâtiments à construire et améliorer : bananeraie (jusqu\'au niveau 12), cabane (loge les singes), entrepôt (stock), puits (bonus aux bananeraies voisines) et marché (meilleur prix de vente).',
        'Les chantiers prennent du temps, de quelques secondes à plusieurs heures. Un bâtisseur au départ, deux de plus à engager en Brundles, et chaque chantier peut être terminé tout de suite en payant.',
        'Les parcelles autour de ta ferme s\'achètent en Brundles. Les bananes servent à tout construire, ou se revendent au marché contre des Brundles.',
        'Quand l\'entrepôt est plein, la récolte s\'arrête : pense à passer vendre ou dépenser !',
        'Onglet « Les voisins » pour visiter les fermes des autres et comparer les productions, classement des fermes sur la page Classements, et la ferme de chacun sur sa fiche joueur.',
        'Un encart sur l\'accueil résume ta ferme, 8 succès à débloquer, 2 nouvelles quêtes du jour, et les grosses fermes apparaissent dans « En direct de la jungle ».',
      ]],
      ['En direct de la jungle', [
        'Pinpoint n\'y apparaît plus.',
        'Les gros gains au Plinkoko n\'y apparaissent qu\'à partir de ×100, et un même jeu ne publie plus qu\'un gros gain toutes les 10 minutes (sauf s\'il est encore plus gros).',
      ]],
    ],
  },
  {
    v: '13.1', date: '14 octobre 2026', title: 'Correctif d\'affichage',
    groups: [['Correctifs', ['Plus de lignes horizontales sur le fond en plein écran sur les grands écrans (2K et plus).']]],
  },
  {
    v: '13', date: '14 octobre 2026', title: 'Six nouveaux jeux gratuits',
    groups: [
      ['Jeux de réflexion', [
        'Queens : une reine par ligne, par colonne et par zone de couleur, sans que deux reines se touchent. Grilles 7×7, 8×8 et 9×9, toujours avec une seule solution. Clic pour une croix puis une reine, glisse pour poser plein de croix.',
        'Tango : remplis la grille 6×6 de soleils et de lunes (3 de chaque par ligne et colonne, jamais 3 pareils d\'affilée, signes = et ×). 3 niveaux.',
        'Pinpoint : devine la catégorie commune à des indices dévoilés un par un. +100 au premier indice, de moins en moins ensuite. 235 catégories, et pas besoin de la formulation exacte.',
        'Sudoku : 3 niveaux, avec notes, surlignage des chiffres identiques et des doublons.',
        'Toutes les grilles sont générées à la volée : on peut jouer à l\'infini. Bonus de +50 % si tu bats le temps de référence, et records personnels.',
      ]],
      ['Arcade', [
        'Démineur contre la montre : 9×9, 16×16 ou 16×30. Le premier clic ne tombe jamais sur une mine, appui long pour un drapeau sur téléphone. Plus tu finis vite, plus ça rapporte (jusqu\'au double).',
        'Snake : le serpent de la jungle mange des bananes. 3 niveaux (bords traversables, murs, puis accélération), +1 à +4 par banane. Flèches, glissés ou boutons à l\'écran.',
      ]],
      ['Et aussi', [
        '18 nouveaux succès, 9 nouvelles quêtes du jour et des stats pour chaque nouveau jeu.',
        'Les beaux exploits (grilles difficiles, Pinpoint au premier indice, grosses parties de Snake) apparaissent dans « En direct de la jungle ».',
        'Le multiplicateur VIP s\'applique aussi à ces six jeux.',
      ]],
    ],
  },
  {
    v: '12', date: '14 octobre 2026', title: 'Le VIP multiplie tes gains gratuits',
    groups: [
      ['Rangs VIP', [
        'Nouveau : chaque rang VIP multiplie tous tes gains gratuits. Roue du jour (en plus de la série de jours), quêtes et leur bonus, calcul mental, quiz capitales, ciné et drapeaux, mot du jour, Plus ou moins et casse-briques.',
        'Le multiplicateur va de ×1,2 (Tamarin) à ×10 (Roi Singe) : ×1,5 Macaque, ×2 Capucin, ×2,5 Babouin, ×3 Chimpanzé, ×4 Mandrill, ×5 Orang-outan, ×6 Gorille, ×8 Gorille argenté. Il remplace les anciens petits bonus sur la roue et les quêtes.',
        'Le bonus est versé en plus du gain normal, avec une notification « Bonus VIP ×… ». Il est affiché sur l\'accueil (rubrique des jeux gratuits, quêtes, carte VIP), dans la roue du jour et dans le tableau des rangs.',
      ]],
      ['Stats et classements', [
        'Le Casino Chibouk en chiffres revient sur la page Stats, dans l\'onglet « Le casino » (à côté de « Mes stats »). La page se souvient de l\'onglet choisi.',
        'La page Classements ne contient plus que les classements : semaine et palmarès, soldes, meilleurs gains par jeu.',
      ]],
    ],
  },
  {
    v: '11.1', date: '14 octobre 2026', title: 'Le suspense d\'abord',
    groups: [
      ['Correctifs', [
        'Le solde affiché en haut ne bouge plus avant la fin de l\'animation : il se met à jour quand les rouleaux, la roue, la bille, les dés ou le tirage s\'arrêtent (slot, roulette, Dice, Keno, Limbo, Roue du Singe, mises annexes du blackjack et roue du jour). Pareil pour les succès, les quêtes, le jackpot et le fil d\'activité.',
        'Le gain reste enregistré dès le lancement : quitter la page pendant l\'animation ne fait rien perdre.',
      ]],
    ],
  },
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
  // toutes les versions publiées depuis la dernière vue (3 max), sinon juste la dernière
  const i = CHANGELOG.findIndex((x) => x.v === seen);
  const list = CHANGELOG.slice(0, i > 0 ? Math.min(i, 3) : 1);
  const c = CHANGELOG[0];
  const go = await modal({ title: `Quoi de neuf dans la V${c.v} ?`, cls: 'wide', html: `<div class="cl-pop">${list.map(versionHTML).join('')}</div>`,
    buttons: [{ label: 'Tout l\'historique', value: 'all' }, { label: 'C\'est parti !', value: true, primary: true }] });
  if (go === 'all') location.hash = '#/news';
}
