// Journal des versions (page « Nouveautés » + fenêtre affichée une fois après une mise à jour)
import { $, modal, esc } from './ui.js';

export const VERSION = '30';

export const CHANGELOG = [
  {
    v: '30', date: '20 octobre 2026', title: 'Géographie et Frappe éclair',
    groups: [
      ['Deux nouveaux mini-jeux', [
        'Quiz géographie : un pays est demandé, clique dessus sur la carte du monde (195 pays). 10 questions, carte zoomable et déplaçable, points cliquables pour les tout petits pays. Facile, moyen ou difficile (+15 à +40 Brundles par pays).',
        'Frappe éclair : 60 secondes pour taper un maximum de mots (façon 10 fast fingers). Facile, normal ou difficile (+2 à +5 Brundles par mot juste), record en mots par minute.',
        'Succès, défis de la jungle, quêtes du jour et classement des mini-jeux pour les deux.',
      ]],
      ['Défis à relever sur chaque jeu', [
        'À côté de chaque machine (sous le classement) et sous chaque mini-jeu : le défi de la jungle s\'il porte sur ce jeu, tes quêtes du jour liées au jeu, et les succès du jeu pas encore débloqués avec leur progression.',
      ]],
      ['Casse-briques', [
        'Plus de niveaux de plus en plus durs : chaque nouvelle partie tire un niveau au hasard (6 niveaux dessinés + des niveaux générés), toujours à la même vitesse. « Réessayer » rejoue le même niveau.',
        'Défis de la jungle : 1 niveau (facile), 2 niveaux (moyen), 3 niveaux (difficile).',
      ]],
      ['Gains', [
        'Démineur : récompenses ×2,5 (100, 300 et 750 Brundles, jusqu\'au double selon le temps restant). Les défis de la jungle du démineur se font sur n\'importe quelle grille, même facile.',
        'Mot du jour : récompenses ×3 (jusqu\'à 1 200 Brundles).',
        'Ferme : les boosts de récolte se cumulent toujours un peu (le 2e compte pour 1/2, le 3e pour 1/3, le 4e pour 1/4…) au lieu de plafonner vite : dix ×1,5 donnent ×2,46, dix ×2 donnent ×3,93, jusqu\'à ×5.',
      ]],
      ['Correctifs', [
        'En direct : un groupe de gros gains affichait le plus gros gain du groupe avec l\'heure du plus récent (un gain de plusieurs heures semblait tout frais). C\'est maintenant le plus récent qui s\'affiche, les autres sont dans le détail (+2…).',
        'Quiz à choix : répondre au hasard très vite en se trompant presque tout le temps (moins de 30 % de bonnes réponses) n\'est plus pris pour de la triche.',
      ]],
    ],
  },
  {
    v: '29', date: '20 octobre 2026', title: 'Correctifs et quêtes ×5',
    groups: [
      ['Correctifs', [
        'Ferme : les boosts de récolte gagnés avant la V28 n\'étaient plus pris en compte (ils n\'avaient pas disparu de ta sauvegarde). Ils reviennent avec le temps qu\'il leur reste.',
        'Ferme : tes ventes passées comptent bien pour le premier prestige, même si ta ferme n\'avait pas été rouverte depuis la mise à jour.',
        'Défi de la jungle : si l\'horloge de ton appareil est décalée, le site se cale sur l\'heure du serveur. Une validation refusée est retentée automatiquement avant d\'afficher une erreur.',
      ]],
      ['Quêtes du jour ×5', [
        'Récompenses multipliées par 5 : 1 500, 3 000 et 5 000 Brundles (avant bonus), et 2 500 de bonus pour les 3 quêtes. Les quêtes déjà tirées aujourd\'hui en profitent aussi.',
      ]],
      ['Cadeaux', [
        'L\'équipe peut maintenant offrir des cadeaux (Brundles, boosts, tours de roue), à un joueur ou à tout le monde. Ils arrivent au prochain chargement de la page.',
      ]],
    ],
  },
  {
    v: '28', date: '19 octobre 2026', title: 'Podium, prestige et chat',
    groups: [
      ['Défi de la jungle : podium', [
        'Un nouveau défi toutes les 12 minutes (au lieu de 15).',
        'Les 3 premiers qui le réussissent sont récompensés : 100 % du prix pour le 1er, 60 % pour le 2e, 35 % pour le 3e (avec tes bonus).',
        'Le podium s\'affiche en direct sur l\'accueil, avec ce que tu toucherais à chaque place.',
      ]],
      ['Ferme : prestige', [
        'La replantation contre des graines d\'or est remplacée par le prestige : après 2 millions de bananes vendues, tu peux remettre ta ferme à zéro contre +100 % de production pour toujours (×2, puis ×3, ×4…).',
        'Le palier double à chaque prestige : 2 M, 4 M, 8 M de bananes vendues… Tes ventes passées comptent déjà pour le premier.',
        'Conservés : parcelles, bâtisseurs, graines d\'or (des caisses), vitesse de construction et boosts en cours.',
        'Les boosts de récolte des caisses se cumulent enfin (avant, un seul comptait) : le 2e à moitié, le 3e au quart… jusqu\'à ×5. Il faut vraiment enchaîner les caisses pour s\'en approcher.',
      ]],
      ['Jungle Connect', [
        'Beaucoup plus de cascades en chaîne : les symboles qui tombent copient souvent un de leurs voisins. 40 % des tours gagnants enchaînent au moins une 2e cascade (19 % avant), 4 % vont jusqu\'à 5 cascades ou plus.',
        'RTP relevé à 99,5 %.',
      ]],
      ['Chat', [
        'Le chat a son propre historique, le même sur tous les appareils : les 80 derniers messages, dans l\'ordre de l\'heure du serveur.',
      ]],
      ['Classements', [
        'Nouveau classement des mini-jeux : pour chaque jeu, parties jouées, réussite, moyenne (score, temps ou essais), record et Brundles gagnés. Clique sur une colonne pour trier.',
        'Les temps moyens sont comptés à partir de cette version.',
      ]],
      ['Divers', [
        'Caisses : onglets des familles bien plus visibles, chacun avec sa couleur et son icône.',
        'Tag spécial « OG CHBK », donné par l\'admin, affiché à côté du pseudo (profil, classements, chat).',
        'Crash : l\'encaissement auto accepte la virgule (« 1,10 ») et il est garanti même si une image saute (turbo, onglet en arrière-plan). L\'historique colore en vert les fusées que tu as encaissées.',
      ]],
    ],
  },
  {
    v: '27', date: '19 octobre 2026', title: 'Jungle Connect et caisses par familles',
    groups: [
      ['Nouvelle machine à sous : Jungle Connect', [
        'Grille de 7×7 à clusters : 5 symboles identiques ou plus reliés horizontalement ou verticalement et c\'est gagné (du Singe Doré à la Feuille de palmier).',
        'Cascades à l\'infini : les symboles gagnants explosent, le reste tombe et de nouveaux symboles arrivent par le haut, un peu plus souvent des Singes Dorés et des Gorilles.',
        'Multiplicateurs ×2 sur les symboles gagnants, multipliés entre eux dans un même cluster (trois ×2 = ×8), jusqu\'à ×256 par cluster.',
        '3 Masques Tribaux = 10 tours gratuits (+5 si 3 masques retombent) avec des multiplicateurs ×2 et ×4 plus fréquents. Bonus environ 1 tour sur 127.',
        'RTP 98,5 % (réglé sur 28 millions de tours simulés), gain max ×5 000. Mode auto, turbo, et clic sur la grille pour accélérer une cascade.',
        '7 succès, un défi de la jungle et des quêtes du jour dédiés.',
      ]],
      ['Récompenses : tes bonus affichés partout', [
        'Les gains des mini-jeux, quêtes, défis et de la roue du jour affichent le montant de base puis, en vert, ce que tu touches vraiment avec tes bonus (VIP, caisses, cosmétiques).',
        'Survole (ou touche) le montant pour voir le détail des bonus qui s\'appliquent.',
      ]],
      ['Caisses : 5 familles', [
        'Raretés revues : bleu 70 %, violet 22 %, rose 6 %, rouge 1,7 %, or 0,3 %. Plus de boosts, moins de Brundles dans les caisses de boosts, et plus aucun boost de rakeback.',
        'Fermier (2 000, 10 000, 20 000) : boosts de récolte et de vente de quelques minutes à plusieurs jours, graines d\'or et vitesse de construction dans la Grange.',
        'Joueur (2 000, 10 000, 20 000) : boosts des mini-jeux et des défis. Les boosts du même type se cumulent avec un rendement dégressif (deux ×3 = ×4,5, puis ×5…) jusqu\'à ×6 (×3 pour les défis).',
        'Coffrets cosmétiques (Élégance, Prestige, Légende) : des objets de la boutique et des exclusifs, un peu plus chers en moyenne qu\'en boutique. Un doublon est remboursé à sa valeur.',
        'Brundles : Banco, Jackpot et All-in (gros risque, jusqu\'à ×40, ×70 et ×150), et Quitte ou double (51 % rien, 49 % le double).',
        'Coffres royaux (50 000 à 25 millions) : uniquement des bonus permanents (intérêts du coffre, roue du jour, défis, gains gratuits, vente des bananes, graines d\'or), toujours au moins quelque chose qui vaut le prix. Un bonus déjà au plafond est converti en gains gratuits.',
      ]],
      ['Défis de la jungle', [
        'Défis plus durs aux mots croisés (2 grilles sans aide), Pinpoint (6 catégories en 2 indices, 5 dès le premier), Snake (40 et 65 bananes) et Tango (2 grilles moyennes ou difficiles).',
      ]],
    ],
  },
  {
    v: '26', date: '19 octobre 2026', title: 'Caisses repensées',
    groups: [
      ['Petites caisses (500 à 10 000)', [
        'Le plaisir tout de suite : Brundles, tickets à gratter, et beaucoup de boosts temporaires (près d\'1 caisse sur 3) : tous les mini-jeux ×1,5 à ×3, récompenses des défis ×1,5 à ×2, récolte de la ferme ×1,5 à ×2, de 1 h à 1 jour selon le prix.',
        'Nouveau lot : tours de roue en plus (1 ou 3), à utiliser quand la roue du jour est déjà tournée (bouton « Tour bonus » en haut).',
        'Elles rendent moins de Brundles (55 à 68 %), la valeur est dans les boosts.',
      ]],
      ['Moyennes caisses (Papaye, Liane)', [
        'Boosts longs (4 h à 3 jours) et premiers bonus permanents (gains gratuits, intérêts du coffre, graine d\'or).',
      ]],
      ['Grandes caisses (Jungle, Singe d\'Or, Roi)', [
        'Plus aucun boost temporaire : presque que des bonus permanents. Gains gratuits, intérêts du coffre, prix de vente des bananes, graines d\'or et vitesse de construction.',
        'Les bonus grossissent avec le prix : Roi jusqu\'à +40 % de gains gratuits ou +100 % d\'intérêts du coffre en un seul lot, jusqu\'à 32 graines d\'or.',
        'Plafonds : intérêts du coffre et prix des bananes +100 %, vitesse de construction −60 %. Au-delà, le lot est remplacé par des Brundles.',
      ]],
      ['Divers', [
        'Le bonus de rakeback du dos de cartes ne s\'applique plus à la roulette ni aux tickets à gratter (ils seraient passés au-dessus de 100 % de retour).',
      ]],
    ],
  },
  {
    v: '25.1', date: '19 octobre 2026', title: 'Plus de caisses',
    groups: [
      ['Caisses', [
        '5 nouvelles caisses classiques : Cacahuète (500), Mangue (2 500), Ananas (10 000), Papaye (20 000) et Liane (30 000). Il y en a maintenant 10, de 500 à 5 millions.',
        'Les lots s\'adaptent au prix : moins la caisse est chère, plus les lots Épique, Légendaire et Mythique sont rares (Cacahuète : Épique 1,2 %, Légendaire 0,12 %, Mythique 0,03 % ; taux pleins à partir de la Jungle) et plus les boosts sont courts. Le bonus permanent du lot mythique va de +0,1 % (Cacahuète) à +5 % (Roi).',
        'Rendement moyen en Brundles (tickets compris) de 72 % pour la Cacahuète à 96 % pour le Roi. La Noix de coco passe de 76 % à 74 %, avec des lots rares bien plus rares.',
      ]],
    ],
  },
  {
    v: '25', date: '18 octobre 2026', title: 'Chat, coffre à intérêts et caisses à thème',
    groups: [
      ['Nouveautés', [
        'Chat de la jungle : onglet « Chat » à côté du direct. Pour ménager la base de données, un message par minute, envoyé avec la synchro du solde (le suivant attend son tour). Les autres le voient en moins d\'une minute s\'ils ont le chat ouvert.',
        'Sur ordinateur, le direct et le chat sont toujours visibles dans un panneau sur la droite (repliable avec l\'onglet « Direct »). Sur mobile, ils restent sur l\'accueil.',
        'Coffre-fort : 5 % d\'intérêts par jour, au prorata du temps passé dans le coffre (même hors ligne).',
        'Cosmétiques avec bonus : chaque objet équipé donne un petit bonus selon sa catégorie. Cadre : gains des mini-jeux. Titre : roue du jour et quêtes. Dos de cartes : rakeback. Thème de slot : vente des bananes. Effet de victoire : intérêts du coffre. De +1 % à +20 % selon l\'objet (détails en boutique).',
      ]],
      ['Caisses', [
        'Caisses à thème : Cosmétique (que des cosmétiques exclusifs, 4 nouveaux à gagner), Va-tout (souvent presque rien, jusqu\'à ×127 le prix) et Fermier (graines d\'or, vitesse de construction permanente, boosts de récolte, chantiers terminés).',
        'Caisses classiques : plus de boosts sur un seul mini-jeu ni de graines d\'or ; à la place des tickets à gratter (Noix de coco, Banane, Jungle) et des Brundles. Elles rendent un peu plus : de 76 % à 96 % du prix en moyenne.',
        'Les tickets gagnés s\'utilisent dans les jeux à gratter avec le bouton « Ticket gratuit ».',
        'Le bonus permanent des gains gratuits n\'est plus plafonné.',
      ]],
      ['Ferme', [
        'Démolir un bâtiment rembourse 60 % de ce que coûtent sa construction et toutes ses améliorations.',
        'Vitesse de construction permanente (Caisse du Fermier) : jusqu\'à −60 % sur la durée des chantiers.',
      ]],
      ['Corrections', [
        'Défi de la jungle parfois affiché comme « en cours » alors qu\'il était déjà gagné : les messages d\'un joueur dont l\'horloge retardait un peu n\'étaient jamais lus par les autres. Le fil relit maintenant les 5 dernières minutes, et l\'accueil vérifie directement le défi en cours.',
        'Menu : Casino en rouge, Caisses en violet.',
      ]],
    ],
  },
  {
    v: '24.1', date: '18 octobre 2026', title: 'Turbo au blackjack',
    groups: [
      ['Nouveautés', [
        'Blackjack : mode Turbo (interrupteur dans « Mains automatiques »). Distribution, retournement des cartes et pauses environ 5 fois plus rapides, en manuel comme en automatique.',
        'Nouvelle Caisse Noix de coco à 1 000 Brundles, la moins chère.',
      ]],
      ['Équilibrage', [
        'Toutes les caisses rendent un peu plus : en moyenne de 70 % (Noix de coco) à 95 % (Caisse du Roi) du prix en Brundles, plus les boosts, graines, cosmétiques et bonus permanents.',
        'Défis de la jungle : le bonus VIP est réduit à un quart du bonus des gains gratuits, et plafonné à ×2. Exemple : un défi difficile rapporte 20 600 au lieu de 37 500 avec un bonus VIP ×2,5, et 30 000 au maximum.',
      ]],
      ['Corrections', [
        'Succès « Premier pas fatal » : il concerne bien les Mines (jeu de casino) et pas le Démineur, où le premier clic ne tombe jamais sur une mine. La description le précise maintenant. Le succès « Démineur » des Mines devient « Cueilleur intrépide » pour éviter la confusion.',
      ]],
    ],
  },
  {
    v: '24', date: '18 octobre 2026', title: 'Les caisses',
    groups: [
      ['Nouveau : les caisses', [
        'Nouvelle page Caisses (menu du haut) : 4 caisses de 5 000 à 5 millions de Brundles, à ouvrir façon case opening. La bande défile, ralentit et s\'arrête sur ton lot. Ouverture par 1, 3 ou 5, et ouverture rapide.',
        'Lots en 5 raretés (Commun, Rare, Épique, Légendaire, Mythique) : des Brundles (jusqu\'à 60 fois le prix de la caisse), des boosts de mini-jeux (×1,5 à ×3 sur un jeu ou sur tous, de 1 à 24 h), des boosts de production de la ferme, des graines d\'or, des cosmétiques exclusifs introuvables en boutique, et en mythique un bonus permanent de +1 à +5 % sur tous les gains gratuits.',
        'Les chances de chaque lot sont affichées. Plus la caisse est chère, plus elle rend en moyenne. Les lots légendaires et mythiques sont annoncés dans le fil.',
      ]],
      ['Ferme à bananes', [
        'Tout se paie maintenant directement en Brundles : constructions, améliorations et singes. Les bananes servent seulement à être vendues (fini l\'achat de bananes).',
        'Les bananes se vendent 5 fois plus cher : 0,6 Brundle la banane, et jusqu\'à 1 Brundle la banane avec un marché niveau 10.',
        'Finir un chantier tout de suite coûte maintenant une part du prix du chantier (selon le temps restant).',
      ]],
      ['Défis de la jungle', [
        'Récompenses : 5 000 (facile), 10 000 (moyen) et 15 000 (difficile), toujours multipliées par ton bonus VIP.',
        'Défis de mini-jeux plus durs : Pinpoint demande 4 catégories en 2 indices (ou 3 dès le premier indice), sans-fautes en mode expert ou difficile, grilles moyennes ou difficiles…',
      ]],
      ['Rangs VIP', [
        'Bonus de passage enfin toujours croissants : 400 000 (Mandrill), 600 000 (Orang-outan), 5 millions (Gorille), 40 millions (Gorille argenté), 300 millions (Roi Singe). Ceux qui avaient déjà passé ces rangs reçoivent la différence.',
      ]],
    ],
  },
  {
    v: '23', date: '17 octobre 2026', title: 'Défis de la jungle',
    groups: [
      ['Nouveau', [
        'Défi de la jungle : toutes les 15 minutes, un nouveau défi commun à tout le monde, en alternance sur les jeux de casino (un ×100 au Plinkoko, 2 blackjacks naturels…) et les mini-jeux (un sans-faute au calcul mental, un sudoku moyen…). Le premier qui le réussit empoche la récompense : de 2 500 à 10 000 Brundles, multipliés par ton bonus VIP des gains gratuits.',
        'Le défi en cours remplace le jackpot sur l\'accueil, avec le chrono, la récompense et le vainqueur. Le jackpot reste affiché à côté de la Chibouk Slot.',
        'Défis remportés et Brundles gagnés visibles dans tes stats.',
      ]],
      ['Ferme à bananes', [
        'Les singes récoltent environ 15 % de bananes en plus, et les bananes se vendent 20 % plus cher.',
        'Constructions et améliorations moins chères (20 à 25 % de moins au début, encore un peu moins cher aux niveaux élevés) et environ 25 % plus rapides. Singes, parcelles et bâtisseurs moins chers aussi.',
      ]],
      ['Fair-play', [
        'Jeux où il faut écrire la réponse (Pinpoint, mots croisés, calcul mental, capitales et ciné en mode écrit) : contrôle beaucoup plus souple. Plus jamais d\'amende ni de blocage sur ces jeux, au pire une partie physiquement impossible ne rapporte rien.',
        'Les blocages et récidives déjà enregistrés sur ces jeux sont effacés.',
      ]],
      ['Corrections', [
        'Suivi de session : la courbe se dessine correctement en mode turbo (toutes les parties finissaient fondues dans un seul point), et les pics sont conservés quand la session devient longue.',
      ]],
    ],
  },
  {
    v: '22', date: '17 octobre 2026', title: 'Casino économe',
    groups: [
      ['Serveur', [
        'Le casino utilise beaucoup moins la base de données, pour rester dans l\'offre gratuite de Firebase même avec toute la bande connectée.',
        'Sauvegarde automatique toutes les 60 s au lieu de 30 s, et plus d\'envoi immédiat à chaque partie de mini-jeu. Ta partie reste protégée par la sauvegarde de secours du navigateur.',
        'Classements, fermes des voisins et palmarès sont gardés dans le navigateur : seuls les profils des joueurs qui ont bougé sont relus, au plus toutes les 10 min (bouton Actualiser : une fois par minute).',
        'Après 4 min sans toucher à rien (ou onglet caché), le casino arrête de relire le fil, le jackpot et les transferts. Tout se remet à jour dès que tu reviens.',
        'Le fil d\'activité est relu toutes les 2 min, les Brundles reçus toutes les 3 min, et les contributions au jackpot partent toutes les 5 min.',
      ]],
      ['Pour l\'admin', [
        'Le journal des mini-jeux est envoyé par lots (jusqu\'à 60 parties par écriture, ou tout de suite en cas de triche). La page Journal lit les lots et affiche les parties comme avant.',
      ]],
    ],
  },
  {
    v: '21.1', date: '17 octobre 2026', title: 'Fair-play des quiz',
    groups: [
      ['Fair-play', [
        'Quiz drapeaux : le drapeau ne trahit plus la réponse dans le code de la page (le nom du fichier contenait le code du pays).',
        'Quiz drapeaux, capitales, ciné, calcul mental, Plus ou moins et Pinpoint : les temps de réponse sont contrôlés. Des réponses plus rapides que le temps de lire la question, ou des clics simulés par un script : amende et blocage du jeu. Un peu trop rapide : pas de récompense.',
        'Quitter un quiz en cours ne rapporte les bonnes réponses qu\'à partir de 3 questions répondues (répondre à une question puis quitter, en boucle, ne marche plus).',
      ]],
      ['Pour l\'admin', [
        'Journal : temps de réponse médian de chaque partie, et nouvelle colonne « Rafale / min » qui signale un joueur ayant terminé 5 parties ou plus d\'un même jeu en une minute.',
      ]],
    ],
  },
  {
    v: '21', date: '17 octobre 2026', title: 'Anti-triche sur les soldes',
    groups: [
      ['Sécurité', [
        'La sauvegarde de secours gardée dans le navigateur est maintenant signée : une copie modifiée à la main (solde gonflé…) est ignorée au chargement et signalée aux admins.',
        'Un compte suspendu par un admin ne peut plus rien enregistrer. Il voit un écran « Compte suspendu » et disparaît des classements.',
        'Si un admin corrige un compte pendant que le joueur est connecté, la sauvegarde suivante du joueur est refusée et sa page se recharge avec les bonnes valeurs.',
      ]],
      ['Pour l\'admin', [
        'Nouvel onglet Joueurs dans l\'espace admin : solde, coffre, misé, gagné, et la fortune maximale qu\'on peut expliquer par le jeu. Les soldes au-dessus sont signalés.',
        'Boutons Corriger (solde, coffre, note) et Suspendre / Réactiver. Chaque action est notée dans le journal.',
      ]],
    ],
  },
  {
    v: '20', date: '16 octobre 2026', title: 'Fair-play des mini-jeux',
    groups: [
      ['Fair-play', [
        'Sudoku : une grille résolue en moins de 40 s (facile), 75 s (moyen) ou 120 s (difficile) ne rapporte plus rien. Même en connaissant la réponse, il faut déjà 20 à 30 s rien que pour la saisir.',
        'Triche évidente (solveur ou script qui remplit la grille, clics simulés, grille remplie sans saisie, temps sous le minimum physique) : amende de 5 fois la récompense et jeu bloqué 1 h. En cas de récidive : 6 h, 24 h, puis 7 jours.',
        'Les mêmes contrôles protègent Queens, Tango, Memory (une partie sans aucune erreur sur 8 paires ou plus est impossible sans tricher), les mots croisés et le démineur.',
      ]],
      ['Pour l\'admin', [
        'Journal des mini-jeux : chaque partie terminée est enregistrée (joueur, jeu, niveau, durée, actions, gain, statut, amende). Page réservée aux admins, dans le menu du pseudo. Ton identifiant de compte est affiché dans Mon profil.',
      ]],
      ['Ferme', [
        'Sous « Singes ouvriers », tu vois combien de singes il faut pour remplir toutes tes bananeraies, combien il en manque (et la place de cabane à prévoir) ou combien sont en trop.',
      ]],
    ],
  },
  {
    v: '19', date: '16 octobre 2026', title: 'Mode turbo',
    groups: [
      ['Mode turbo', [
        'Nouvel interrupteur Turbo dans le panneau des paris automatiques du Plinkoko, du Dice, du Limbo, du Keno, de la Roue du Singe, des Mines, de la Tower, du Hi-Lo, des jeux à gratter, de la roulette et du Crash.',
        'En turbo, les animations sont très courtes (noix 3 fois plus rapides, dé et Limbo instantanés, tickets grattés d\'un coup, roue et roulette accélérées, fusée du Crash ×4) et l\'auto enchaîne les parties presque sans pause. Le réglage marche aussi quand tu joues à la main, et il est gardé pour chaque jeu.',
        'Les maths ne changent pas : mêmes chances, mêmes gains. Les sons répétitifs sont coupés en turbo.',
      ]],
      ['Performances', [
        'La sauvegarde locale de secours, l\'historique des parties et le suivi de session s\'écrivent maintenant par paquets au lieu de le faire à chaque partie, pour rester fluide même à plusieurs dizaines de parties par seconde. La sauvegarde en ligne reste groupée toutes les 30 s, comme avant.',
      ]],
    ],
  },
  {
    v: '18.2', date: '16 octobre 2026', title: 'Rangs VIP élevés rééquilibrés',
    groups: [['Équilibrage', [
      'Les jeux eux-mêmes n\'ont pas changé (le Plinkoko rend bien 99 %), mais aux gros volumes de mises, le rakeback et les bonus de passage rendaient plus que ce que le casino garde : enchaîner les mises devenait rentable à coup sûr.',
      'Les rangs du haut sont plus durs à atteindre : Orang-outan à 250 millions misés, Gorille à 2,5 milliards, Gorille argenté à 25 milliards, Roi Singe à 250 milliards. Leurs bonus de passage passent à +300 000, +2,5 M, +15 M et +100 M.',
      'Rakeback des rangs du haut : 0,62 % à 0,7 % (au lieu de 0,75 % à 1,35 %). Il s\'adapte maintenant à la marge de chaque jeu : ×0,4 au blackjack, ×2,3 aux tickets à gratter, ×3,7 à la roulette.',
      'Résultat : à partir d\'Orang-outan, tous les jeux de casino rendent entre 99,5 et 99,9 % rakeback compris. Les petits rangs, leurs bonus et les soldes de chacun ne changent pas.',
    ]]],
  },
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
