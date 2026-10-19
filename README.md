# Casino Chibouk

Casino entre potes avec de l'argent 100 % fictif (des **Brundles**). Le site est statique et s'héberge sur **GitHub Pages**. Les comptes et les soldes sont stockés dans **Firebase**, avec le plan gratuit Spark.

- Connexion par **pseudo + mot de passe**, sans email.
- **1 000 Brundles offerts** à la création du compte, puis la **roue du jour** (500 à 5 000 Brundles, une fois par jour, remise à zéro à minuit heure de Paris), multipliée par la série de jours consécutifs (jusqu'à ×2).
- **Quêtes du jour** : 3 missions renouvelées à minuit (+300 / +600 / +1 000, +500 si les 3 sont faites).
- **11 rangs VIP** selon le total misé (de Ouistiti à Roi Singe, 250 milliards) : **bonus de passage** à chaque nouveau rang (+500 à +100 millions, versé une seule fois, y compris rétroactivement pour les rangs déjà atteints), **rakeback en continu** (0,1 à 0,7 % de chaque mise aux jeux de casino, adapté à la marge de chaque jeu, tombe dans une cagnotte récupérable à tout moment), **multiplicateur de tous les gains gratuits** (roue du jour, quêtes, quiz, mot du jour, casse-briques… de ×1,2 à ×10, versé en plus du gain normal). Clic sur un rang pour voir le tableau complet. À partir du rang Orang-outan, rakeback + bonus de passage restent sous l'avantage du casino : les jeux de casino rendent entre 99,5 et 99,9 % au total (sauf la slot, volontairement au-dessus de 100 % pour l'instant). Détail par rang et par jeu : `node tools/vip-rtp.mjs`.
- **Classement de la semaine** (bénéfice du lundi au dimanche), trophée permanent pour le vainqueur et palmarès.
- **Boutique cosmétique** : cadres d'avatar, titres, dos de cartes, thèmes de la slot, effets de victoire (de 2 000 à 100 millions de Brundles). Ça donne une utilité aux Brundles et freine l'inflation des soldes.
- **Jackpot commun** alimenté par 1 % des mises de la slot (payé par le casino), qui peut tomber sur n'importe quel spin. Chance par spin = 1,5 % × mise ÷ jackpot, plafonnée à 1 % (ex. : jackpot de 10 000 et mise de 100 → 1 sur 6 667), affichée sur la slot.
- **En direct de la jungle** : fil d'activité de l'accueil (gains à partir de ×25, tous les succès, jackpots, passages de rang VIP, achats, quêtes, vainqueurs de la semaine).
- **Coffre-fort** (bouton en haut, ou menu du pseudo) : met des Brundles à l'abri des mises. Dépôt et retrait libres, sans frais ni délai. Le contenu du coffre compte dans la fortune (classement et succès de solde).
- **Ferme à bananes** (jeu de gestion) : bananeraies, cabanes, entrepôts, puits et marché sur un terrain 7 × 7. Production continue même hors ligne (stock limité par les entrepôts), chantiers avec durée ; constructions, améliorations, singes, bâtisseurs et parcelles payés en Brundles. Les bananes se vendent au marché : 0,6 Brundle la banane, jusqu'à 1 Brundle avec un marché niveau 10. Graines d'or : replanter sa ferme après 1 million de bananes récoltées donne +5 % de production par graine, pour toujours. Fermes des autres joueurs visitables. Réglages et formules dans `js/farm-core.js`.
- **Stats** : onglet « Mes stats » et onglet « Le casino » (total misé et gagné par tout le monde, RTP réel, Brundles distribués, tableau par jeu).
- **Classements** : classement de la semaine et palmarès, fortunes (solde + coffre), meilleurs gains par jeu.
- **Historique** des 50 dernières parties de chaque jeu (onglet du classement à côté du jeu, gardé sur l'appareil).
- **Aucune mise maximum** : mise libre + bouton MAX (Slot, Plinkoko, Crashibouk, Tower, Mines, Dice), jetons jusqu'à 25k + « Tapis » (blackjack), jetons jusqu'à 25k empilables (roulette).
- **Succès** : 157 défis (globaux et par jeu) qui rapportent de +100 à +10 000 Brundles, avec une page dédiée et une notification à chaque déblocage. Un clic sur un succès montre qui l'a débloqué, et qui l'a eu en premier (avec la date).
- **Profils** : photo (ou un des 12 singes) et petite bio, visibles en cliquant sur un pseudo dans les classements. La photo est réduite à quelques Ko et stockée dans Firestore (pas besoin de Firebase Storage, donc ça reste gratuit).
- **Singe conseiller** : petites astuces contextuelles sur chaque page, désactivables depuis le menu du pseudo.
- **Paris automatiques** sur les 14 jeux de casino (tickets automatiques pour les jeux à gratter) : nombre de paris libre ou infini, arrêt sur objectif de gain, limite de perte ou solde minimum, et mise qui augmente ou baisse d'un pourcentage après chaque perte (retour à la mise de départ après une victoire ; pas sur le blackjack, la roulette et les tickets, dont la mise ne se résume pas à un seul montant).
- **Mode turbo** sur les jeux de casino à enchaîner (Jungle Connect, Plinkoko, Dice, Limbo, Keno, Roue, Mines, Tower, Hi-Lo, tickets, roulette, Crash) : animations raccourcies et auto quasi sans pause, mêmes maths. Les écritures locales sont regroupées (`js/lazysave.js`) pour rester fluide.
- **Chat et direct** (`js/chat.js`) : sur ordinateur, panneau fixé à droite avec le fil « En direct » et le chat ; sur mobile, sur l'accueil. Le chat passe par la collection `feed` (1 écriture par message), au plus 1 message par minute (rythme de la synchro du solde) ; lecture toutes les 45 s quand le chat est ouvert, 2 min sinon.
- **Coffre-fort** : 5 % d'intérêts par jour au prorata du temps (calculés à la volée, ajoutés au coffre à chaque sauvegarde : aucune écriture en plus).
- **Bonus des cosmétiques** (`js/bonus.js`) : l'objet équipé de chaque catégorie donne un petit bonus (cadre : mini-jeux, titre : roue et quêtes, dos de cartes : rakeback, thème : vente des bananes, effet : intérêts du coffre).
- **Caisses** (`js/loot.js`, `js/cases.js`, page `#/cases`) : 5 familles, ouverture façon case opening. Raretés bleu 70 %, violet 22 %, rose 6 %, rouge 1,7 %, or 0,3 %. **Fermier** (2 000, 10 000, 20 000) : boosts de récolte / vente, graines d'or, vitesse de construction. **Joueur** (2 000, 10 000, 20 000) : boosts des mini-jeux et des défis, cumulables avec un rendement dégressif (`STACK_W`, plafonds `STACK_CAP`). **Coffrets cosmétiques** (Élégance, Prestige, Légende) : objets de la boutique, doublon remboursé à sa valeur. **Brundles** : Banco, Jackpot, All-in (95 % de retour, gros risque) et Quitte ou double (51 / 49). **Coffres royaux** (50 000 à 25 millions) : bonus permanents uniquement (intérêts du coffre, roue du jour, défis, gains gratuits, vente des bananes, graines d'or). Aucun boost de rakeback. Le lot est tiré et enregistré au clic, l'animation ne fait que le révéler.
- **Récompenses avec bonus** (`js/rewards.js`) : les gains gratuits (mini-jeux, quêtes, défis, roue du jour) affichent « base → avec tes bonus », avec le détail des bonus au survol.
- **Défi de la jungle** (`js/challenges.js`) : toutes les 15 min, un défi commun à tous les joueurs (casino et mini-jeux en alternance), tiré au sort de la même façon dans tous les navigateurs. Le premier qui le réussit gagne 5 000, 10 000 ou 15 000 Brundles selon la difficulté, avec un bonus VIP réduit (un quart du bonus VIP des gains gratuits, au plus ×2). Le vainqueur est désigné par Firestore (collection `challenges`, un document par créneau, création unique vérifiée avec l'heure du serveur) ; les autres l'apprennent par le fil d'activité.
- **Fair-play des mini-jeux** (`js/fairplay.js`) : Sudoku, Queens, Tango, Memory, Mots croisés, Démineur, les quiz (drapeaux, capitales, ciné, calcul mental), Plus ou moins et Pinpoint surveillent la partie (temps de réponse aux quiz : médiane sous 0,35 s = triche, sous 0,55 s = pas de récompense) (temps réel sur l'horloge, nombre d'actions, clics « simulés » par un script, rythme robotique). Sudoku résolu sous 40 s / 75 s / 120 s (facile / moyen / difficile) : pas de récompense. Triche évidente (solveur, script, grille remplie sans saisie, Memory sans aucune erreur, temps sous le minimum physique de saisie) : amende de 5 × la récompense et jeu bloqué 1 h, puis 6 h, 24 h et 7 jours en cas de récidive. Jeux où la réponse s'écrit au clavier (Pinpoint, mots croisés, calcul mental, capitales et ciné en mode écrit) : contrôle souple, jamais d'amende ni de blocage, seulement « pas de récompense » si c'est physiquement impossible. Tout est calculé dans le navigateur : un tricheur déterminé peut toujours contourner, d'où le journal.
- **Espace admin** (`#/admin`, onglet Joueurs) : pour chaque joueur, la fortune maximale explicable (1 000 de départ + tout ce qu'il a gagné aux jeux, en bonus, mini-jeux, ferme et transferts reçus − tout ce qu'il a misé). Un solde au-dessus ne peut venir que d'une modification à la main : il est signalé. L'admin peut **corriger** le solde et le coffre d'un joueur ou le **suspendre** (il ne peut plus jouer ni sauvegarder, et disparaît des classements). Un onglet resté ouvert chez le joueur voit sa sauvegarde refusée et se recharge avec les bonnes valeurs. La sauvegarde locale de secours est signée : une copie modifiée à la main dans le navigateur est ignorée et signalée dans le journal.
- **Limite à connaître** : tout le jeu tourne dans le navigateur et Firebase (offre Spark) ne fait que stocker. Un joueur qui sait se servir des outils de développement peut toujours écrire un faux solde en base ; ces outils servent à le repérer et à le corriger. Pour l'empêcher complètement, il faudrait que les parties soient jouées sur un serveur (Cloud Functions, offre Blaze), ce qui demande de réécrire tous les jeux.
- **Journal des mini-jeux** (page admin `#/admin`) : une ligne par partie terminée (joueur, jeu, niveau, durée, nombre d'actions, gain, statut OK / trop rapide / triche, raison, amende), filtres par joueur, jeu et statut, résumé par joueur avec ses meilleurs temps. Stocké dans la collection Firestore `logs` (1 écriture par partie), lisible seulement par les admins.
- **Volume** réglable (bouton haut-parleur, ou menu du pseudo sur téléphone), gardé sur l'appareil.
- **Nouveautés** : journal des versions sur le site (et dans `CHANGELOG.md`).
- **Classement à côté de chaque jeu** : top 5 des plus gros parieurs (volume misé), du meilleur multiplicateur et du plus gros gain sur ce jeu.
- **Stats** par jeu (misé, gagné, bilan, RTP réel, plus gros gain…), un **classement** des soldes et un **classement des meilleures wins par jeu** (top 3).
- **Suivi de session** (bouton graphique dans la barre du haut) : courbe des gains/pertes qui part de 0 au lancement, verte au-dessus de 0 et rouge en dessous. Il continue quand on change de jeu ou qu'on recharge la page, jusqu'au reset. Seuls les jeux comptent (pas le bonus quotidien ni les transferts).
- **Envoi de Brundles** entre joueurs (bouton avion en papier, ou menu du pseudo). Le destinataire les reçoit automatiquement dans les 3 minutes, avec une notification.
- Sauvegarde **groupée toutes les 60 s** pour économiser les quotas Firebase (voir plus bas).

### Les jeux

| Jeu | Principe | RTP |
|---|---|---|
| **Chibouk Slot** | Machine à sous 5×3, 99 lignes connectées. WILD, WILD ×2, et 3 SCATTER n'importe où = tours gratuits avec gains ×2 (re-déclenchables). Animation des gros gains à partir de ×10. | ≈ 100 % |
| **Blackjack du Singe** | 6 jeux, blackjack payé 3:2, croupier reste sur 17, doubler, séparer **n'importe quelles cartes** (4 mains), cartes 3D. Mises annexes **Perfect Pairs** (6:1 / 15:1 / 25:1, RTP 99,7 %) et **21+3** (couleur 5:1, suite 11:1, brelan 30:1, quinte flush 45:1, brelan couleur 100:1, RTP 99,5 %). | ≈ 99,5 % |
| **Roulette Banane** | Roulette européenne à un zéro, roue et bille animées. | 97,3 % |
| **Plinkoko** | 8, 12 ou 16 rangées, risque faible / moyen / élevé, jusqu'à ×1000, billes multiples. RTP de chaque mode entre 98,9 et 99,1 % (`tools/plinko-rtp.mjs`), gain arrondi au Brundle de façon aléatoire pour rester juste même avec une mise de 1. | 99 % |
| **Crashibouk** | Le multiplicateur grimpe, encaisse avant l'explosion. Encaissement auto possible. Une fois la mise encaissée, la manche passe en avance rapide pour pouvoir rejouer tout de suite. | 99 % |
| **Tower** | 9 étages, 5 difficultés (de 1 bombe sur 4 cases à 3 bombes sur 4). Chaque étage monte le multi, encaisse quand tu veux. Auto avec parcours tracé sur le plateau. | 99 % |
| **Mines** | Grille 5×5, 1 à 24 mines. Chaque banane trouvée augmente le multi, encaisse avant de tomber sur une mine. | 99 % |
| **Dice** | Tirage de 0,00 à 100,00. Choisis « en dessous » ou « au-dessus » et ta chance (0,01 % à 98 %) : multi = 99 ÷ chance. | 99 % |
| **Hi-Lo** | Plus haut ou plus bas que la carte affichée ? Paquet infini, chaque bonne réponse multiplie le gain (0,99 ÷ probabilité), encaissement quand on veut. | 99 % |
| **Keno** | 1 à 10 numéros sur 40, 10 tirés, 3 niveaux de risque, jusqu'à ×10 000. Tables calculées exactement (`tools/keno-rtp.mjs`). | 99 % |
| **Roue du Singe** | 30 cases équiprobables, 3 niveaux de risque (jusqu'à ×29,7). | 99 % |
| **Jungle Connect** | Grille 7×7 à clusters (5+ symboles reliés), cascades infinies, multiplicateurs ×2 qui se multiplient dans un cluster (×256 max), 3 Masques Tribaux = 10 tours gratuits avec ×2 / ×4 plus fréquents. Maths dans `js/games/jungle-math.js` (réglées par simulation, gain max ×5 000). | 98,5 % |
| **Limbo** | Cible de ×1,01 à ×1 000 000 : on gagne mise × cible si le tirage l'atteint (chance = 99 ÷ cible). | 99 % |
| **Jeux à gratter** | 3 tickets : Banane Express (10, jusqu'à ×500), Singe d'Or (100, jusqu'à ×1 000), Trésor de la Jungle (1 000, jusqu'à ×10 000). 3 montants identiques = gagné. Grattage à la souris ou au doigt, case par case, « Tout gratter » ou tickets automatiques. Le gain est tiré à l'achat. Tables dans `js/games/scratch-math.js`. | 98 % |
| **Calcul mental** | Gratuit : 10 calculs, 3 modes. Facile (10 s, +10 par bonne réponse, +50 sans-faute), Moyen (12 s, +15, +75), Difficile (15 s, +25, +125 : multiplications à deux chiffres, carrés, pourcentages). | — |
| **Quiz capitales** | Gratuit : 10 questions dans les deux sens (pays → capitale, capitale → pays), 127 pays. Mode facile (4 choix, 10 s, +10 par bonne réponse, +50 sans-faute) ou expert (réponse à écrire, 15 s, +20 par bonne réponse, +100 sans-faute). | — |
| **Quiz ciné** | Gratuit : 10 questions à 4 choix sur 800 films (réalisateur, acteurs, année de sortie), 15 s chacune. Même barème. Données : `data/movies.json`, extrait de la base TMDB (The Movies Dataset). | — |
| **Quiz drapeaux** | Gratuit : 10 drapeaux parmi 159 pays (SVG du projet flag-icons, licence MIT, dans `data/flags/`). Modes facile et expert comme les capitales. | — |
| **Mot du jour** | Gratuit, une fois par jour : façon Motus, même mot pour tout le monde, 6 essais. +400 à +70 selon le nombre d'essais. Dictionnaire de 77 000 mots dans `data/mots.txt` (projet an-array-of-french-words, licence MIT), 346 mots à deviner dans `data/mots-cibles.json`. | — |
| **Plus ou moins** | Gratuit : quel film a eu le plus gros budget ? Série jusqu'à 15, +10 par bonne réponse, +50 au bout. Budgets tirés de ta base TMDB. | — |
| **Queens** | Gratuit : une reine par ligne, colonne et zone de couleur, jamais deux reines qui se touchent. Grilles 7×7, 8×8, 9×9 générées à la volée avec une solution unique. +60 / +90 / +130, +50 % sous le temps de référence. | — |
| **Tango** | Gratuit : grille 6×6 de soleils et de lunes (3 de chaque par ligne et colonne, jamais 3 pareils d'affilée, signes = et ×). 3 niveaux, solution unique. +40 / +70 / +100, +50 % si rapide. | — |
| **Pinpoint** | Gratuit : trouver la catégorie commune à 5 indices dévoilés un par un (570 catégories, jamais deux fois la même avant d'avoir tout vu, réponses tolérantes). +40 au 1er indice, puis +28 / +20 / +12 / +6. | — |
| **Sudoku** | Gratuit : 3 niveaux (40 / 32 / 25 chiffres donnés), solution unique, notes. +80 / +160 / +300, +50 % si rapide. | — |
| **Démineur** | Gratuit, contre la montre : 9×9 (10 mines, 3 min), 16×16 (40 mines, 8 min), 16×30 (99 mines, 15 min). +40 / +120 / +300, jusqu'au double selon le temps restant. | — |
| **Snake** | Gratuit : 3 niveaux (bords traversables, murs, puis accélération). +1 / +2 / +4 par banane. | — |
| **Memory** | Gratuit : retrouver les paires. 4×4, 6×4, 6×6. +30 / +60 / +100, +50 % si peu de coups. | — |
| **Mots croisés** | Gratuit : grille générée à chaque partie à partir de 900 mots et définitions (les mots des 25 dernières grilles sont évités). 7, 10 ou 14 mots (première lettre donnée en facile). +40 / +70 / +110, chaque lettre révélée coûte 10 % du gain. | — |
| **Casse-briques** | Gratuit, sans mise, accessible à tout moment : +100 Brundles par niveau terminé (6 niveaux en boucle, de plus en plus durs). | — |

Si tu quittes la page au milieu d'une partie de Tower ou de Mines, elle est encaissée automatiquement au palier atteint (ou la mise est remboursée si aucune case n'a été choisie). Pareil pour le Crash (encaissement au multiplicateur du moment) et le Blackjack (la main est terminée en restant).

---

## 1. Tester tout de suite (mode démo)

Tant que `js/firebase-config.js` n'est pas rempli, le site tourne en **mode démo local**. Les comptes sont alors enregistrés dans ton navigateur uniquement.

Les modules JavaScript ne fonctionnent pas en ouvrant `index.html` par double-clic. Il faut lancer un petit serveur local :

```bash
cd casino-chibouk
python -m http.server 8000
# puis ouvre http://localhost:8000
```

---

## 2. Configurer Firebase (5 min)

1. Va sur <https://console.firebase.google.com> et clique sur **Ajouter un projet**. Google Analytics n'est pas nécessaire.
2. **Authentication** → *Commencer* → *Sign-in method* → active **Adresse e-mail/Mot de passe**.
3. **Firestore Database** → *Créer une base de données*. Choisis le **mode production** et une région en Europe, par exemple `europe-west1`.
4. **Firestore Database → Règles** : copie-colle le contenu du fichier `firestore.rules`, puis clique sur **Publier**. À refaire à chaque fois que ce fichier change (dernière fois en V23 : défis de la jungle).
5. **Paramètres du projet** (roue dentée) → *Vos applications* → icône **Web `</>`**. Enregistre l'app sans activer Firebase Hosting, puis copie le bloc `firebaseConfig` dans **`js/firebase-config.js`**.
6. **Authentication → Paramètres → Domaines autorisés** → ajoute `tonpseudo.github.io`.

7. **Devenir admin** (journal des mini-jeux, correction des soldes, suspensions) : sur le site, ouvre **Mon profil** et copie ton *Identifiant du compte*. Dans **Firestore Database → Données**, crée une collection `admins` et un document dont l'**ID** est cet identifiant (ajoute n'importe quel champ, par exemple `nom : "moi"`). Recharge le site : « Espace admin » apparaît dans le menu du pseudo. Seuls les comptes présents dans `admins` peuvent lire le journal, corriger un solde ou suspendre un joueur.

> Le bloc `firebaseConfig` (apiKey…) **n'est pas secret** : il est forcément visible dans un site web. La sécurité est assurée par les **règles Firestore** : un joueur ne peut modifier que son propre profil.

Aucune autre clé API n'est nécessaire.

---

## 3. Mettre en ligne sur GitHub Pages

1. Crée un dépôt sur GitHub, par exemple `casino-chibouk`. Il doit être public pour GitHub Pages gratuit.
2. Envoie **tout le contenu du dossier** à la racine du dépôt : `index.html`, `css/`, `js/`, `assets/`… Le plus simple est le glisser-déposer via *Add file → Upload files*.
3. **Settings → Pages** → *Source : Deploy from a branch* → branche `main`, dossier `/ (root)` → *Save*.
4. Au bout d'une minute environ, le site est en ligne sur `https://tonpseudo.github.io/casino-chibouk/`.

**Publier une nouvelle version :** envoie les fichiers modifiés comme d'habitude. Les joueurs déjà connectés sont prévenus en moins de 3 minutes par un bandeau « Nouvelle version disponible ». La mise à jour s'installe toute seule au prochain changement de page, ou tout de suite avec le bouton « Mettre à jour ». Avant de recharger, le site encaisse les parties en cours, sauvegarde le profil et re-télécharge tous ses fichiers, pour ne jamais mélanger deux versions. La version détectée est la constante `VERSION` de `js/changelog.js` : pense à l'augmenter à chaque publication (c'est ce qui affiche aussi la fenêtre « Quoi de neuf »).

Le fichier `.nojekyll` est déjà inclus. Il empêche GitHub de transformer les fichiers.

---

## 4. Économie des quotas Firebase

Le plan gratuit Spark offre **50 000 lectures et 20 000 écritures par jour**. Le site les ménage ainsi :

| Action | Coût |
|---|---|
| Connexion / ouverture du site | ~4 lectures (profil, fil depuis la dernière visite, jackpot, transferts reçus) |
| Jouer (spins, mains, lancers, mini-jeux…) | **0** : tout est calculé en local |
| Sauvegarde du solde et des stats | 1 écriture **toutes les 60 s max**, seulement s'il y a eu un changement |
| Fermeture de l'onglet, bonus quotidien, boutique, coffre, amende | 1 écriture immédiate |
| Journal des mini-jeux (pour l'admin) | 1 écriture pour 60 parties (ou 10 min après la première partie du lot ; tout de suite en cas de triche) |
| Classements, stats, fermes des voisins, transferts | liste gardée dans le navigateur ; toutes les 10 min, 1 lecture par joueur **ayant joué depuis** (1 lecture si personne). Relecture complète au plus toutes les 12 h |
| Vérification des Brundles reçus | 1 lecture toutes les 3 min |
| Fil d'activité + jackpot | 2 lectures toutes les 2 min (seuls les nouveaux messages sont lus) ; contributions de la slot au jackpot : 1 écriture toutes les 5 min |
| Publication dans le fil | 1 écriture par exploit (gros gain, succès…), 8 s minimum entre deux |
| Palmarès des semaines | gardé dans le navigateur, relu une fois par semaine ; 1 écriture par semaine |
| Défi de la jungle | 1 écriture pour le vainqueur (+ 1 message dans le fil) ; 1 lecture pour un joueur qui réussit trop tard |
| Envoi ou réception d'un transfert | 2 écritures |

**Joueur absent = 0 lecture :** après 4 min sans clic ni touche (ou onglet caché / téléphone verrouillé), plus rien n'est relu. Tout se remet à jour dès que le joueur revient. Une partie en spins automatiques compte comme de l'activité.

Ordre de grandeur : un joueur actif pendant 1 h, c'est au plus ~80 écritures et ~150 lectures. 12 joueurs actifs 4 h par jour : ~4 000 écritures et ~7 000 lectures, loin des limites. Les réglages sont dans `js/config.js` (section « Économie de la base de données »).

**Transferts :** l'expéditeur est débité et le transfert créé dans une seule écriture atomique, vérifiée par les règles Firestore (montant entier positif, destinataire existant, débit exact du même montant). Seul le destinataire peut encaisser un transfert, et une seule fois.

Une copie de secours est aussi gardée dans le navigateur (`localStorage`). Si une sauvegarde échoue (onglet fermé brutalement, réseau coupé…), elle est renvoyée à la connexion suivante.

**Anti double-onglet :** si le casino est ouvert dans deux onglets, l'ancien se met en pause. Ça évite que les soldes s'écrasent l'un l'autre.

---

## 5. Réglages (`js/config.js`)

| Paramètre | Défaut | Rôle |
|---|---|---|
| `START_BALANCE` | 1000 | Solde à la création du compte. Si tu le changes, change aussi `1000` dans `firestore.rules`. |
| `DAILY_BONUS` | 1000 | Bonus quotidien |
| `SYNC_INTERVAL_MS` | 30000 | Fréquence max des sauvegardes |
| `LEADERBOARD_CACHE_MS` | 120000 | Durée du cache du classement |
| `BREAKER_REWARD` | 100 | Gain par niveau de casse-briques |

---

## 6. Les maths de la machine à sous

- 5 rouleaux de 50 à 51 symboles, 3 rangées, **99 lignes** : toutes les lignes où chaque symbole touche le suivant (même rangée ou diagonale, jamais 2 rangées d'écart). On choisit la **mise totale** (10 minimum), répartie sur les 99 lignes ; le gain est arrondi au Brundle près.
- Symboles, du plus rare au plus courant : SCATTER (Totem), WILD ×2, WILD (Roi Singe), Singe, 7, BAR, Cloche, Pastèque, Raisin, Banane, Citron, Cerise.
- Les gains des lignes se comptent **depuis le rouleau de gauche** (3, 4 ou 5 symboles) et s'additionnent. Le WILD remplace tous les symboles sauf le SCATTER. Le WILD ×2 (rouleaux 2 à 4 seulement) fait pareil et double le gain de la ligne (×4 avec deux).
- Le **SCATTER** paie n'importe où (×2 / ×10 / ×50 la mise pour 3 / 4 / 5) et **3 / 4 / 5 SCATTER** donnent **10 / 15 / 20 tours gratuits**, avec tous les gains **×2**. Le bonus peut se redéclencher.

Le RTP est **calculé exactement** (`theoreticalRTP()` dans `slots-math.js`) puis vérifié par simulation :

| Indicateur | Valeur |
|---|---|
| **RTP exact** | **100,1 %** (léger avantage joueur) |
| dont lignes / SCATTER / tours gratuits | 71,5 % / 3,6 % / 25,1 % |
| RTP simulé (2 × 3 millions de tours) | 100,1 % et 100,6 % |
| Tours avec un gain | ≈ 34 % |
| Bonus | ≈ 1 tour sur 72 |
| Gros gain (≥ ×10, animation) | ≈ 1 tour sur 53 |
| Gain ≥ ×100 | ≈ 1 tour sur 4 000 |

Si tu modifies la table des gains (`PAYTABLE`) ou la composition des rouleaux (`REEL_WEIGHTS`) dans `js/games/slots-math.js`, revérifie le RTP avec :

```bash
node tools/simulate-rtp.mjs 2000000   # calcul exact + simulation
```

Le blackjack (avantage maison ~0,5 %) et la roulette (2,7 %) gardent les règles classiques d'un vrai casino.

**Plinkoko** : la case d'arrivée suit une loi binomiale (50/50 à chaque cheville). Les tables de `js/games/plinko-math.js` donnent un RTP exact de 99 % pour chacune des 9 combinaisons rangées × risque.

**Crashibouk** : le point d'explosion suit P(crash ≥ x) = 0,99 / x, donc le RTP vaut 99 % quel que soit le moment où tu encaisses. Le multiplicateur suit e^(0,1·t) : ×2 en ~7 s, ×10 en ~23 s.

**Tower** : à l'étage k, multiplicateur = 0,99 × (cases ÷ cases sûres)^k. **Mines** : après k bananes, multiplicateur = 0,99 × C(25, k) ÷ C(25 − mines, k). **Dice** : multiplicateur = 99 ÷ chance. Les trois donnent donc un RTP de 99 % quel que soit le moment où tu t'arrêtes.

---

## 7. Limites à connaître

- **Triche possible** : sans serveur (les Cloud Functions demandent le plan payant), toute la logique tourne dans le navigateur. Un pote qui bidouille la console pourrait se donner des Brundles. Les règles Firestore limitent seulement les dégâts : solde ≥ 0, pseudo non modifiable, chacun ne touche qu'à son propre profil. Entre amis et avec de l'argent fictif, c'est acceptable.
- **Mot de passe oublié** : il n'y a pas de vrai email, donc pas de réinitialisation automatique. Supprime le compte dans *Firebase → Authentication* et *Firestore → users*, et le joueur en recrée un.
- Si quelqu'un joue en même temps sur son téléphone **et** son PC, c'est la dernière sauvegarde qui gagne.

---

## Structure

```
index.html
css/style.css              thème sombre jungle + tous les jeux
js/firebase-config.js      config Firebase (déjà remplie avec ton projet)
js/config.js               réglages
js/app.js                  connexion, navigation, lobby, bonus quotidien
js/backend.js              Firebase (Auth + Firestore) / mode démo
js/wallet.js               solde, stats, sauvegarde groupée
js/farm-core.js            ferme à bananes : règles, coûts, production (sans affichage)
js/farm.js                 ferme à bananes : page, dessins, marché, voisins
js/loot.js                 caisses : contenu, probabilités, application des lots et des boosts
js/rewards.js              affichage « base → avec bonus » des récompenses gratuites et détail des bonus
js/cases.js                caisses : page d'ouverture (bande animée)
js/stats.js                stats personnelles + chiffres de tout le casino
js/ranking.js              classements (semaine, soldes, meilleurs gains)
js/vip.js                  fenêtre des rangs VIP et cagnotte de rakeback
js/players.js              liste des joueurs (cache partagé)
js/tracker.js              suivi de session en graphique
js/art.js                  singes, symboles, icônes et illustrations en SVG
js/sfx.js                  effets sonores synthétisés
js/games/slots-math.js     maths de la machine à sous (RNG, lignes, gains)
js/games/slots.js          machine à sous
js/games/blackjack.js      blackjack 3D
js/games/roulette.js       roulette animée
js/games/breaker.js        casse-briques
js/games/plinko-math.js    tables et probabilités du Plinkoko
js/games/plinko.js         Plinkoko
js/games/crash.js          Crashibouk
js/games/tower.js          Tower
js/games/mines.js          Mines
js/games/dice.js           Dice
js/games/quiz.js           Calcul mental
js/games/mcq.js            moteur des quiz à choix multiples
js/games/capitals.js       Quiz capitales (+ capitals-data.js)
js/games/movies.js         Quiz ciné (données dans data/movies.json)
js/gameboard.js            classement affiché à côté de chaque jeu
js/achievements.js         définition des succès et moteur de déblocage
js/achpage.js              page des succès
js/profile.js              profils (avatar, bio, fiche joueur)
js/tips.js                 le singe conseiller (astuces)
js/changelog.js            journal des versions (page Nouveautés) et numéro de version
js/fairplay.js             fair-play des mini-jeux (détection des solveurs, amendes, blocages)
js/challenges.js           défi de la jungle (un défi commun toutes les 15 min, le premier qui réussit gagne)
js/activity.js             présence du joueur (coupe les lectures en arrière-plan quand personne ne joue)
js/gamelog.js              journal des mini-jeux (une ligne par partie, collection logs)
js/admin.js                page admin du journal (#/admin)
js/lazysave.js             écritures locales regroupées (sauvegarde de secours, historique, suivi)
js/updater.js              détection d'une nouvelle version publiée et rechargement propre
js/progress.js             rangs VIP (rakeback, bonus de passage, multiplicateur gratuit), roue du jour, quêtes
js/dailywheel.js           fenêtre de la roue du jour
js/shop.js                 boutique et cosmétiques
js/social.js               fil d'activité et jackpot commun
js/weekly.js               classement de la semaine et palmarès
js/history.js              historique des parties
js/games/hilo.js           Hi-Lo
js/games/keno.js           Keno (+ keno-math.js)
js/games/wheel.js          Roue du Singe
js/games/jungle.js         Jungle Connect (+ jungle-math.js : grille, cascades, tables à 98,5 %)
js/games/limbo.js          Limbo
js/games/flags.js          Quiz drapeaux (+ flags-data.js)
js/games/motus.js          Mot du jour
js/games/higher.js         Plus ou moins
js/games/free-common.js    outils communs des jeux de réflexion (chrono, niveaux, fin de partie)
js/games/queens.js         Queens (+ queens-gen.js : génération à solution unique)
js/games/tango.js          Tango (+ tango-gen.js)
js/games/pinpoint.js       Pinpoint (+ pinpoint-data.js : 570 catégories)
js/games/sudoku.js         Sudoku (+ sudoku-gen.js)
js/games/demineur.js       Démineur
js/games/snake.js          Snake
js/games/memory.js         Memory
js/games/crossword.js      Mots croisés (+ crossword-gen.js : génération, crossword-data.js : mots)
js/games/scratch.js        Jeux à gratter (+ scratch-math.js : tickets et tables à 98 %)
js/vault.js                coffre-fort
data/                      films, drapeaux, dictionnaire
firestore.rules            règles de sécurité à publier
tools/simulate-rtp.mjs     RTP de la slot (calcul exact + simulation)
tools/keno-rtp.mjs         RTP exact des tables du Keno
tools/plinko-rtp.mjs       RTP exact + simulation de chaque mode du Plinkoko
tools/vip-rtp.mjs          retour effectif de chaque jeu avec le rakeback et les bonus VIP, rang par rang
tools/new-games-rtp.mjs    RTP des jeux de la V9
```
