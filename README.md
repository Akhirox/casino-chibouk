# Casino Chibouk

Casino entre potes avec de l'argent 100 % fictif (des **Brundles**). Le site est statique et s'héberge sur **GitHub Pages**. Les comptes et les soldes sont stockés dans **Firebase**, avec le plan gratuit Spark.

- Connexion par **pseudo + mot de passe**, sans email.
- **1 000 Brundles offerts** à la création du compte, puis **1 000 par jour** avec le bouton cadeau (une fois par jour, remise à zéro à minuit heure de Paris).
- **Aucune mise maximum** : mise libre + bouton MAX (Slot, Plinkoko, Crashibouk, Tower, Mines, Dice), jetons jusqu'à 25k + « Tapis » (blackjack), jetons jusqu'à 25k empilables (roulette).
- **Stats** par jeu (misé, gagné, bilan, RTP réel, plus gros gain…) et un **classement** des joueurs.
- Sauvegarde **groupée toutes les 30 s** pour économiser les quotas Firebase (voir plus bas).

### Les jeux

| Jeu | Principe | RTP |
|---|---|---|
| **Chibouk Slot** | Machine à sous 5×3, 21 lignes. 3 WILD n'importe où = tours gratuits avec gains ×2 (re-déclenchables). | ≈ 100 % |
| **Blackjack du Singe** | 6 jeux, blackjack payé 3:2, croupier reste sur 17, doubler et séparer (4 mains), cartes 3D. | ≈ 99,5 % |
| **Roulette Banane** | Roulette européenne à un zéro, roue et bille animées. | 97,3 % |
| **Plinkoko** | 8, 12 ou 16 rangées, risque faible / moyen / élevé, jusqu'à ×1000, billes multiples. | 99 % |
| **Crashibouk** | Le multiplicateur grimpe, encaisse avant l'explosion. Encaissement auto possible. | 99 % |
| **Tower** | 9 étages, 5 difficultés (de 1 bombe sur 4 cases à 3 bombes sur 4). Chaque étage monte le multi, encaisse quand tu veux. | 99 % |
| **Mines** | Grille 5×5, 1 à 24 mines. Chaque banane trouvée augmente le multi, encaisse avant de tomber sur une mine. | 99 % |
| **Dice** | Tirage de 0,00 à 100,00. Choisis « en dessous » ou « au-dessus » et ta chance (0,01 % à 98 %) : multi = 99 ÷ chance. | 99 % |
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
4. **Firestore Database → Règles** : copie-colle le contenu du fichier `firestore.rules`, puis clique sur **Publier**.
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
| Page Stats (classement) | ~15 lectures, gardées en cache 2 min |

Un joueur qui joue 2 h sans pause fait au maximum ~240 écritures. Même à 20 potes, tu restes très loin des limites.

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

- 5 rouleaux de 48 symboles, 3 rangées, **21 lignes** (celles de ton image). La mise totale vaut 21 × la mise par ligne.
- Symboles, du plus rare au plus courant : 👑 Roi Singe (WILD), 🐒 Singe, 7, BAR, Cloche, Pastèque, Raisin, Banane, Citron, Cerise.
- Les gains se comptent **depuis le rouleau de gauche** (3, 4 ou 5 symboles). Le WILD remplace tous les symboles.
- **3 / 4 / 5 WILD n'importe où** donnent **10 / 15 / 20 tours gratuits**, avec tous les gains **×2**. Le bonus peut se redéclencher.

Simulation sur 20 millions de tours :

| Indicateur | Valeur |
|---|---|
| **RTP total** | **≈ 99,9 %** (quasi neutre) |
| dont tours gratuits | ≈ 28 % |
| Tours avec un gain | ≈ 35 % |
| Bonus | ≈ 1 tour sur 63 |

Si tu modifies la table des gains (`PAYTABLE`) ou la composition des rouleaux (`REEL_WEIGHTS`) dans `js/games/slots-math.js`, revérifie le RTP avec :

```bash
node tools/simulate-rtp.mjs 2000000
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
js/stats.js                page stats + classement
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
firestore.rules            règles de sécurité à publier
tools/simulate-rtp.mjs     simulateur de RTP
```
