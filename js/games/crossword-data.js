// Mots croisés : mots (sans accents, en majuscules) et leurs définitions.
// La grille est générée à chaque partie en croisant une sélection de ces mots.
const RAW = `
BANANE|Fruit préféré des singes
SINGE|Habitant de la jungle qui adore les bananes
JUNGLE|Forêt tropicale très dense
LIANE|Le singe s'y balance
GORILLE|Le plus grand des primates
TIGRE|Grand félin rayé
LION|Roi des animaux
ZEBRE|Cheval à rayures
GIRAFE|Animal au très long cou
ELEPHANT|Il a une trompe et de grandes oreilles
PERROQUET|Oiseau coloré qui répète ce qu'on dit
TOUCAN|Oiseau au gros bec coloré
SERPENT|Reptile sans pattes
CROCODILE|Reptile aux longues mâchoires des fleuves
PANDA|Ours noir et blanc qui mange du bambou
KOALA|Petit marsupial qui dort dans les eucalyptus
RENARD|Animal rusé des fables
LOUP|Il hurle à la lune
OURS|Gros mammifère qui hiberne
LAPIN|Il a de grandes oreilles et aime les carottes
CHAT|Animal domestique qui miaule
CHIEN|Le meilleur ami de l'homme
CHEVAL|On le monte au galop
VACHE|Elle donne du lait
MOUTON|Il donne de la laine
COCHON|Animal rose de la ferme
POULE|Elle pond des œufs
CANARD|Il fait coin-coin
HIBOU|Rapace nocturne
AIGLE|Rapace royal
DAUPHIN|Mammifère marin très intelligent
REQUIN|Poisson aux dents redoutables
BALEINE|Le plus grand animal du monde
PIEUVRE|Elle a huit bras
CRABE|Il marche de côté
ABEILLE|Elle fait du miel
FOURMI|Petit insecte très travailleur
PAPILLON|Il était chenille avant
ARAIGNEE|Elle tisse sa toile
ESCARGOT|Il porte sa maison sur le dos
TORTUE|Elle avance lentement avec sa carapace
GRENOUILLE|Elle coasse dans la mare
CASINO|Lieu où l'on joue de l'argent
ROULETTE|Jeu où une bille tourne sur un cylindre
JETON|Pièce utilisée sur le tapis de jeu
MISE|Somme engagée dans un pari
JACKPOT|Le gros lot de la machine à sous
CARTE|Il y en a 52 dans un jeu
POKER|Jeu de cartes avec du bluff
BLUFF|Faire croire qu'on a une bonne main
DES|On les lance au craps
ROUGE|Couleur opposée au noir à la roulette
NOIR|Couleur opposée au rouge à la roulette
CROUPIER|Il distribue les cartes au casino
CHANCE|Ce qu'il faut pour gagner à la loterie
PARI|Mise sur un résultat
GAIN|Ce qu'on remporte quand on gagne
PERTE|Le contraire du gain
AS|Carte la plus forte au blackjack
ROI|Figure au-dessus de la dame
DAME|Figure entre le valet et le roi
VALET|Figure la plus basse
TREFLE|Couleur de cartes en forme de feuille
COEUR|Couleur rouge des cartes
PIQUE|Couleur noire en forme de fer de lance
CARREAU|Couleur rouge en forme de losange
TAPIS|On y pose les jetons
ARGENT|Ce que l'on gagne ou perd
TRESOR|Coffre rempli d'or
PIRATE|Il cherche des trésors avec un bandeau sur l'œil
COFFRE|Boîte fermée à clé
FERME|Exploitation agricole
CHAMP|Terrain cultivé
RECOLTE|Ce qu'on cueille à la saison
TRACTEUR|Engin agricole
GRANGE|Bâtiment pour le foin
PUITS|On y puise l'eau
MARCHE|On y vend fruits et légumes
CABANE|Petite maison en bois
POMME|Fruit d'Ève et de Newton
POIRE|Fruit en forme de goutte
CERISE|Petit fruit rouge à noyau
FRAISE|Fruit rouge des jardins
ORANGE|Agrume et couleur
CITRON|Agrume jaune et acide
ANANAS|Fruit tropical avec une couronne
MANGUE|Fruit tropical à gros noyau
RAISIN|On en fait du vin
MELON|Fruit d'été à chair orange
PASTEQUE|Gros fruit vert à chair rouge
KIWI|Fruit vert et poilu
NOIX|Fruit à coque du noyer
COCO|Noix des cocotiers
CAROTTE|Légume orange
TOMATE|Fruit rouge qu'on mange en salade
SALADE|Plat de feuilles assaisonnées
PAIN|On l'achète à la boulangerie
BEURRE|On l'étale sur les tartines
FROMAGE|Le camembert en est un
CHOCOLAT|Douceur faite à partir du cacao
GATEAU|Dessert d'anniversaire
CREPE|Spécialité bretonne fine et ronde
PIZZA|Spécialité italienne au four
CAFE|Boisson noire du matin
THE|Boisson chaude en infusion
LAIT|Boisson blanche de la vache
EAU|Liquide indispensable à la vie
SUCRE|Il rend le café plus doux
SEL|Il assaisonne les plats
SOLEIL|Étoile au centre de notre système
LUNE|Satellite de la Terre
ETOILE|Elle brille dans la nuit
PLANETE|Mars en est une
TERRE|Notre planète
NUAGE|Il peut apporter la pluie
PLUIE|Eau qui tombe du ciel
NEIGE|Flocons blancs de l'hiver
ORAGE|Tempête avec éclairs et tonnerre
VENT|Air en mouvement
ARC|Arme qui tire des flèches
MER|Grande étendue d'eau salée
OCEAN|Plus grand qu'une mer
PLAGE|Bord de mer avec du sable
SABLE|On en fait des châteaux
ILE|Terre entourée d'eau
MONTAGNE|Les Alpes en sont
VOLCAN|Il crache de la lave
RIVIERE|Cours d'eau qui se jette dans un fleuve
FLEUVE|La Seine en est un
LAC|Étendue d'eau douce entourée de terre
FORET|Grand ensemble d'arbres
ARBRE|Le chêne en est un
FLEUR|La rose en est une
ROSE|Fleur à épines
FEUILLE|Elle tombe en automne
PRINTEMPS|Saison des fleurs
ETE|Saison des vacances
AUTOMNE|Saison des feuilles mortes
HIVER|Saison la plus froide
LUNDI|Premier jour de la semaine
DIMANCHE|Jour de repos
MATIN|Début de la journée
SOIR|Fin de la journée
NUIT|On y dort
HEURE|Soixante minutes
MINUTE|Soixante secondes
ANNEE|Douze mois
PARIS|Capitale de la France
LYON|Ville des Lumières et de la gastronomie
MARSEILLE|Grande ville du Vieux-Port
NICE|Ville de la promenade des Anglais
ROME|Capitale de l'Italie
LONDRES|Capitale du Royaume-Uni
MADRID|Capitale de l'Espagne
BERLIN|Capitale de l'Allemagne
TOKYO|Capitale du Japon
EGYPTE|Pays des pyramides
CHINE|Pays de la Grande Muraille
BRESIL|Pays de la samba
CANADA|Pays de l'érable
MAROC|Pays de Marrakech
EUROPE|Continent de la France
AFRIQUE|Continent du Sahara
ASIE|Plus grand continent
TOUR|Celle d'Eiffel est célèbre
PONT|Il permet de traverser une rivière
CHATEAU|Demeure de seigneur avec des tours
MAISON|Lieu où l'on habite
PORTE|On l'ouvre pour entrer
FENETRE|Elle laisse passer la lumière
TOIT|Il couvre la maison
JARDIN|Espace vert autour de la maison
ECOLE|Lieu où l'on apprend
LIVRE|On le lit page par page
CRAYON|Il sert à dessiner
STYLO|Il sert à écrire à l'encre
GOMME|Elle efface
CAHIER|On y écrit ses leçons
TABLE|Meuble pour manger
CHAISE|On s'assoit dessus
LIT|On y dort
LAMPE|Elle éclaire
MIROIR|On s'y regarde
HORLOGE|Elle donne l'heure
TELEPHONE|Appareil pour appeler
ORDINATEUR|Machine à calculer et à surfer
CLAVIER|On tape dessus
ECRAN|On regarde les images dessus
SOURIS|Rongeur ou accessoire d'ordinateur
VOITURE|Véhicule à quatre roues
VELO|Deux roues à pédales
AVION|Il vole dans le ciel
BATEAU|Il navigue sur l'eau
TRAIN|Il roule sur des rails
FUSEE|Elle part dans l'espace
ROUE|Elle tourne autour d'un axe
ROUTE|Voie pour les voitures
FOOTBALL|Sport à onze avec un ballon rond
TENNIS|Sport de raquette sur un court
RUGBY|Sport au ballon ovale
JUDO|Art martial japonais
SKI|Sport de glisse sur la neige
NATATION|Sport de piscine
VELO|Petite reine
COURSE|Compétition de vitesse
BALLON|On tape dedans
BUT|Ce que marque l'attaquant
ARBITRE|Il siffle les fautes
MEDAILLE|Récompense olympique
COUPE|Trophée du vainqueur
MUSIQUE|Art des sons
PIANO|Instrument à touches noires et blanches
GUITARE|Instrument à six cordes
VIOLON|Instrument à archet
TAMBOUR|On tape dessus en rythme
FLUTE|Instrument à vent
CHANSON|Paroles mises en musique
DANSE|On la fait en musique
FILM|On le regarde au cinéma
CINEMA|Salle obscure
THEATRE|On y joue des pièces
CIRQUE|Spectacle avec clowns et acrobates
CLOWN|Il fait rire avec son nez rouge
MAGIE|Art de l'illusion
DRAGON|Créature qui crache du feu
FEE|Créature magique avec une baguette
SORCIER|Il jette des sorts
CHEVALIER|Guerrier en armure
PRINCESSE|Fille du roi
COURONNE|Elle se porte sur la tête du roi
EPEE|Arme du chevalier
BOUCLIER|Il protège du coup d'épée
ROBOT|Machine qui imite l'homme
FANTOME|Esprit qui hante un château
VAMPIRE|Il boit du sang la nuit
MOMIE|Pharaon entouré de bandelettes
PYRAMIDE|Tombeau égyptien
DINOSAURE|Animal disparu il y a 66 millions d'années
MAMMOUTH|Éléphant poilu préhistorique
MEDECIN|Il soigne les malades
POMPIER|Il éteint les incendies
POLICIER|Il arrête les voleurs
BOULANGER|Il fait le pain
CUISINIER|Il prépare les plats
FACTEUR|Il distribue le courrier
PILOTE|Il conduit l'avion
PEINTRE|Artiste du pinceau
ROUGEGORGE|Petit oiseau à la poitrine orangée
ARCENCIEL|Bande colorée dans le ciel après la pluie
SOURIRE|Expression de joie sur le visage
RIRE|Ce que provoque une blague
JOIE|Sentiment de bonheur
PEUR|On la ressent devant un danger
AMOUR|Sentiment très fort
AMI|Copain de confiance
FAMILLE|Parents et enfants
BEBE|Tout petit enfant
FRERE|Fils des mêmes parents
SOEUR|Fille des mêmes parents
TETE|Partie du corps au-dessus du cou
MAIN|Elle a cinq doigts
PIED|On marche dessus
OEIL|Organe de la vue
NEZ|Organe de l'odorat
BOUCHE|On mange avec
DENT|Elle croque les aliments
OREILLE|Organe de l'ouïe
BRAS|Membre entre l'épaule et la main
JAMBE|Membre entre la hanche et le pied
ROUGE|Couleur de la fraise
BLEU|Couleur du ciel
VERT|Couleur de l'herbe
JAUNE|Couleur de la banane
BLANC|Couleur de la neige
VIOLET|Couleur de l'aubergine
UN|Le premier nombre
DEUX|Une paire
TROIS|Le nombre des mousquetaires
DIX|Le nombre de doigts des mains
CENT|Dix fois dix
MILLE|Dix fois cent
ZERO|Le nombre du rien
`;

export const WORDS = [];
const seen = new Set();
for (const line of RAW.split('\n')) {
  const [w, clue] = line.split('|');
  if (!w || !clue) continue;
  const word = w.trim().toUpperCase();
  if (!/^[A-Z]{2,10}$/.test(word) || seen.has(word)) continue;
  seen.add(word);
  WORDS.push({ word, clue: clue.trim() });
}
