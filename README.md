# Casino Chibouk

Casino entre potes avec de l'argent 100 % fictif (des **Brundles**). Le site est statique et s'héberge sur **GitHub Pages**. Les comptes et les soldes sont stockés dans **Firebase**, avec le plan gratuit Spark.

- Connexion par **pseudo + mot de passe**, sans email.
- **1 000 Brundles offerts** à la création du compte, puis la **roue du jour** (500 à 5 000 Brundles, une fois par jour, remise à zéro à minuit heure de Paris), multipliée par la série de jours consécutifs (jusqu'à ×2).
- **Quêtes du jour** : 3 missions renouvelées à minuit (+300 / +600 / +1 000, +500 si les 3 sont faites).
- **11 rangs VIP** selon le total misé (de Ouistiti à Roi Singe, 10 milliards) : **bonus de passage** à chaque nouveau rang (+500 à +100 millions, versé une seule fois, y compris rétroactivement pour les rangs déjà atteints), **rakeback en continu** (0,1 à 1,35 % de chaque mise aux jeux de casino tombe dans une cagnotte récupérable à tout moment), **multiplicateur de tous les gains gratuits** (roue du jour, quêtes, quiz, mot du jour, casse-briques… de ×1,2 à ×10, versé en plus du gain normal). Clic sur un rang pour voir le tableau complet.
- **Classement de la semaine** (bénéfice du lundi au dimanche), trophée permanent pour le vainqueur et palmarès.
- **Boutique cosmétique** : cadres d'avatar, titres, dos de cartes, thèmes de la slot, effets de victoire (de 2 000 à 100 millions de Brundles). Ça donne une utilité aux Brundles et freine l'inflation des soldes.
- **Jackpot commun** alimenté par 1 % des mises de la slot (payé par le casino), qui peut tomber sur n'importe quel spin. Chance par spin = 1,5 % × mise ÷ jackpot, plafonnée à 1 % (ex. : jackpot de 10 000 et mise de 100 → 1 sur 6 667), affichée sur la slot.
- **En direct de la jungle** : fil d'activité de l'accueil (gains à partir de ×25, tous les succès, jackpots, passages de rang VIP, achats, quêtes, vainqueurs de la semaine).
- **Coffre-fort** (bouton en haut, ou menu du pseudo) : met des Brundles à l'abri des mises. Dépôt et retrait libres, sans frais ni délai. Le contenu du coffre compte dans la fortune (classement et succès de solde).
- **Ferme à bananes** (jeu de gestion) : bananeraies, cabanes, entrepôts, puits et marché sur un terrain 7 × 7. Production continue même hors ligne (stock limité par les entrepôts), chantiers avec durée, bâtisseurs et parcelles payés en Brundles, vente des bananes au marché (et achat à 1 Brundle la banane). Graines d'or : replanter sa ferme après 1 million de bananes récoltées donne +5 % de production par graine, pour toujours. Fermes des autres joueurs visitables. Réglages et formules dans `js/farm-core.js`.
- **Stats** : onglet « Mes stats » et onglet « Le casino » (total misé et gagné par tout le monde, RTP réel, Brundles distribués, tableau par jeu).
- **Classements** : classement de la semaine et palmarès, fortunes (solde + coffre), meilleurs gains par jeu.
- **Historique** des 50 dernières parties de chaque jeu (onglet du classement à côté du jeu, gardé sur l'appareil).
- **Aucune mise maximum** : mise libre + bouton MAX (Slot, Plinkoko, Crashibouk, Tower, Mines, Dice), jetons jusqu'à 25k + « Tapis » (blackjack), jetons jusqu'à 25k empilables (roulette).
- **Succès** : 157 défis (globaux et par jeu) qui rapportent de +100 à +10 000 Brundles, avec une page dédiée et une notification à chaque déblocage. Un clic sur un succès montre qui l'a débloqué, et qui l'a eu en premier (avec la date).
- **Profils** : photo (ou un des 12 singes) et petite bio, visibles en cliquant sur un pseudo dans les classements. La photo est réduite à quelques Ko et stockée dans Firestore (pas besoin de Firebase Storage, donc ça reste gratuit).
- **Singe conseiller** : petites astuces contextuelles sur chaque page, désactivables depuis le menu du pseudo.
- **Paris automatiques** sur les 13 jeux de casino (tickets automatiques pour les jeux à gratter) : nombre de paris libre ou infini, arrêt sur objectif de gain ou limite de perte.
- **Nouveautés** : journal des versions sur le site (et dans `CHANGELOG.md`).
- **Classement à côté de chaque jeu** : top 5 des plus gros parieurs (volume misé), du meilleur multiplicateur et du plus gros gain sur ce jeu.
- **Stats** par jeu (misé, gagné, bilan, RTP réel, plus gros gain…), un **classement** des soldes et un **classement des meilleures wins par jeu** (top 3).
- **Suivi de session** (bouton graphique dans la barre du haut) : courbe des gains/pertes qui part de 0 au lancement, verte au-dessus de 0 et rouge en dessous. Il continue quand on change de jeu ou qu'on recharge la page, jusqu'au reset. Seuls les jeux comptent (pas le bonus quotidien ni les transferts).
- **Envoi de Brundles** entre joueurs (bouton avion en papier, ou menu du pseudo). Le destinataire les reçoit automatiquement dans les 90 secondes, avec une notification.
- Sauvegarde **groupée toutes les 30 s** pour économiser les quotas Firebase (voir plus bas).

### Les jeux

| Jeu | Principe | RTP |
|---|---|---|
| **Chibouk Slot** | Machine à sous 5×3, 99 lignes connectées. WILD, WILD ×2, et 3 SCATTER n'importe où = tours gratuits avec gains ×2 (re-déclenchables). Animation des gros gains à partir de ×10. | ≈ 100 % |
| **Blackjack du Singe** | 6 jeux, blackjack payé 3:2, croupier reste sur 17, doubler, séparer **n'importe quelles cartes** (4 mains), cartes 3D. Mises annexes **Perfect Pairs** (6:1 / 15:1 / 25:1, RTP 99,7 %) et **21+3** (couleur 5:1, suite 11:1, brelan 30:1, quinte flush 45:1, brelan couleur 100:1, RTP 99,5 %). | ≈ 99,5 % |
| **Roulette Banane** | Roulette européenne à un zéro, roue et bille animées. | 97,3 % |
| **Plinkoko** | 8, 12 ou 16 rangées, risque faible / moyen / élevé, jusqu'à ×1000, billes multiples. | 99 % |
| **Crashibouk** | Le multiplicateur grimpe, encaisse avant l'explosion. Encaissement auto possible. Une fois la mise encaissée, la manche passe en avance rapide pour pouvoir rejouer tout de suite. | 99 % |
| **Tower** | 9 étages, 5 difficultés (de 1 bombe sur 4 cases à 3 bombes sur 4). Chaque étage monte le multi, encaisse quand tu veux. Auto avec parcours tracé sur le plateau. | 99 % |
| **Mines** | Grille 5×5, 1 à 24 mines. Chaque banane trouvée augmente le multi, encaisse avant de tomber sur une mine. | 99 % |
| **Dice** | Tirage de 0,00 à 100,00. Choisis « en dessous » ou « au-dessus » et ta chance (0,01 % à 98 %) : multi = 99 ÷ chance. | 99 % |
| **Hi-Lo** | Plus haut ou plus bas que la carte affichée ? Paquet infini, chaque bonne réponse multiplie le gain (0,99 ÷ probabilité), encaissement quand on veut. | 99 % |
| **Keno** | 1 à 10 numéros sur 40, 10 tirés, 3 niveaux de risque, jusqu'à ×10 000. Tables calculées exactement (`tools/keno-rtp.mjs`). | 99 % |
| **Roue du Singe** | 30 cases équiprobables, 3 niveaux de risque (jusqu'à ×29,7). | 99 % |
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
| **Pinpoint** | Gratuit : trouver la catégorie commune à 5 indices dévoilés un par un (235 catégories, réponses tolérantes). +40 au 1er indice, puis +28 / +20 / +12 / +6. | — |
| **Sudoku** | Gratuit : 3 niveaux (40 / 32 / 25 chiffres donnés), solution unique, notes. +80 / +160 / +300, +50 % si rapide. | — |
| **Démineur** | Gratuit, contre la montre : 9×9 (10 mines, 3 min), 16×16 (40 mines, 8 min), 16×30 (99 mines, 15 min). +40 / +120 / +300, jusqu'au double selon le temps restant. | — |
| **Snake** | Gratuit : 3 niveaux (bords traversables, murs, puis accélération). +1 / +2 / +4 par banane. | — |
| **Memory** | Gratuit : retrouver les paires. 4×4, 6×4, 6×6. +30 / +60 / +100, +50 % si peu de coups. | — |
| **Mots croisés** | Gratuit : grille générée à chaque partie à partir de 280 mots et définitions. 7, 10 ou 14 mots (première lettre donnée en facile). +40 / +70 / +110, chaque lettre révélée coûte 10 % du gain. | — |
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
4. **Firestore Database → Règles** : copie-colle le contenu du fichier `firestore.rules`, puis clique sur **Publier**. À refaire à chaque fois que ce fichier change (c'est le cas en V9 : fil d'activité, jackpot commun et palmarès des semaines).
5. **Paramètres du projet** (roue dentée) → *Vos applications* → icône **Web `</>`**. Enregistre l'app sans activer Firebase Hosting, puis copie le bloc `firebaseConfig` dans **`js/firebase-config.js`**.
6. **Authentication → Paramètres → Domaines autorisés** → ajoute `tonpseudo.github.io`.

> Le bloc `firebaseConfig` (apiKey…) **n'est pas secret** : il est forcément visible dans un site web. La sécurité est assurée par les **règles Firestore** : un joueur ne peut modifier que son propre profil.

Aucune autre clé API n'est nécessaire.

---

## 3. Mettre en ligne sur GitHub Pages

1. Crée un dépôt sur GitHub, par exemple `casino-chibouk`. Il doit être public pour GitHub Pages gratuit.
2. Envoie **tout le contenu du dossier** à la racine du dépôt : `index.html`, `css/`, `js/`, `assets/`… Le plus simple est le glisser-déposer via *Add file → Upload files*.
3. **Settings → Pages** → *Source : Deploy from a branch* → branche `main`, dossier `/ (root)` → *Save*.
4. Au bout d'une minute environ, le site est en ligne sur `https://tonpseudo.github.io/casino-chibouk/`.

Le fichier `.nojekyll` est déjà inclus. Il empêche GitHub de transformer les fichiers.

---

## 4. Économie des quotas Firebase

Le plan gratuit Spark offre **50 000 lectures et 20 000 écritures par jour**. Le site les ménage ainsi :

| Action | Coût |
|---|---|
| Connexion / ouverture du site | 1 lecture |
| Jouer (spins, mains, lancers…) | **0** : tout est calculé en local |
| Sauvegarde du solde et des stats | 1 écriture **toutes les 30 s max**, seulement s'il y a eu un changement |
| Fermeture de l'onglet, bonus quotidien, niveau de casse-briques | 1 écriture immédiate |
| Page Stats, liste des destinataires d'un transfert | 1 lecture par joueur inscrit, gardée en cache 2 min |
| Vérification des Brundles reçus | 1 lecture toutes les 90 s (seulement quand l'onglet est visible) |
| Fil d'activité + jackpot | 2 lectures toutes les 90 s (seuls les nouveaux messages sont lus), + 1 écriture toutes les 90 s si tu as joué à la slot |
| Publication dans le fil | 1 écriture par exploit (gros gain, succès Or/Légende…), 20 s minimum entre deux |
| Palmarès des semaines | quelques lectures toutes les 15 min, 1 écriture par semaine (la première personne connectée le lundi) |
| Envoi ou réception d'un transfert | 2 écritures |

Un joueur qui joue 2 h sans pause fait au maximum ~240 écritures et ~80 lectures. Même à 20 potes, tu restes très loin des limites.

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
js/changelog.js            journal des versions (page Nouveautés)
js/progress.js             rangs VIP (rakeback, bonus de passage, multiplicateur gratuit), roue du jour, quêtes
js/dailywheel.js           fenêtre de la roue du jour
js/shop.js                 boutique et cosmétiques
js/social.js               fil d'activité et jackpot commun
js/weekly.js               classement de la semaine et palmarès
js/history.js              historique des parties
js/games/hilo.js           Hi-Lo
js/games/keno.js           Keno (+ keno-math.js)
js/games/wheel.js          Roue du Singe
js/games/limbo.js          Limbo
js/games/flags.js          Quiz drapeaux (+ flags-data.js)
js/games/motus.js          Mot du jour
js/games/higher.js         Plus ou moins
js/games/free-common.js    outils communs des jeux de réflexion (chrono, niveaux, fin de partie)
js/games/queens.js         Queens (+ queens-gen.js : génération à solution unique)
js/games/tango.js          Tango (+ tango-gen.js)
js/games/pinpoint.js       Pinpoint (+ pinpoint-data.js : 235 catégories)
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
tools/new-games-rtp.mjs    RTP des jeux de la V9
```
