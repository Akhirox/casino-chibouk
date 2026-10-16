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
CHIMPANZE|Grand singe très proche de l'homme
ORANGOUTAN|Grand singe roux d'Asie
BABOUIN|Singe aux fesses colorées
OUISTITI|Tout petit singe d'Amérique
LEMURIEN|Primate de Madagascar
PANTHERE|Grand félin souvent noir
JAGUAR|Félin tacheté d'Amérique du Sud
GUEPARD|L'animal terrestre le plus rapide
LEOPARD|Félin tacheté d'Afrique
LYNX|Félin aux oreilles pointues terminées par un pinceau
PUMA|Couguar d'Amérique
HYENE|Animal de la savane qui semble rire
CHACAL|Canidé charognard d'Afrique
HIPPOPOTAME|Il passe ses journées dans l'eau
RHINOCEROS|Il porte une ou deux cornes sur le nez
BUFFLE|Gros bovin d'Afrique
GAZELLE|Petite antilope rapide
ANTILOPE|Ruminant gracieux aux cornes
CHAMEAU|Il a deux bosses
DROMADAIRE|Il n'a qu'une bosse
LAMA|Il crache quand il est fâché
ALPAGA|Cousin du lama à la laine douce
KANGOUROU|Il porte son petit dans une poche
WOMBAT|Marsupial australien trapu
CASTOR|Il construit des barrages
LOUTRE|Mammifère qui flotte sur le dos
PHOQUE|Mammifère marin qui se prélasse sur la banquise
MORSE|Il a de longues défenses et des moustaches
OTARIE|Phoque à oreilles des zoos
PINGOUIN|Oiseau noir et blanc qui vole
MANCHOT|Oiseau qui ne vole pas, en Antarctique
FLAMANT|Oiseau rose sur une patte
PELICAN|Oiseau à la poche sous le bec
CIGOGNE|Elle apporte les bébés selon la légende
HERON|Échassier gris des étangs
CYGNE|Oiseau blanc au long cou
PAON|Il fait la roue
AUTRUCHE|Le plus grand des oiseaux
COLIBRI|Le plus petit des oiseaux
CORBEAU|Oiseau noir de la fable
PIE|Oiseau voleur noir et blanc
MOINEAU|Petit oiseau des villes
PIGEON|Oiseau des places publiques
MOUETTE|Oiseau du bord de mer
CHOUETTE|Rapace nocturne sans aigrettes
FAUCON|Rapace très rapide en piqué
VAUTOUR|Rapace charognard
CONDOR|Grand vautour des Andes
DINDE|Volaille de Noël
OIE|Elle gardait le Capitole
COQ|Il chante au lever du jour
POUSSIN|Bébé de la poule
CHEVRE|Elle donne du lait pour le fromage
BREBIS|Femelle du bélier
AGNEAU|Petit de la brebis
TAUREAU|Mâle de la vache
VEAU|Petit de la vache
ANE|Il brait
MULET|Croisement d'un âne et d'une jument
PONEY|Petit cheval
HERISSON|Il se met en boule
TAUPE|Elle creuse des galeries
ECUREUIL|Il cache des noisettes
MARMOTTE|Elle siffle et hiberne
BLAIREAU|Il creuse un terrier, ou sert à se raser
SANGLIER|Cochon sauvage
CERF|Il porte des bois
BICHE|Femelle du cerf
CHEVREUIL|Petit cervidé des bois
ELAN|Grand cervidé du Nord
RENNE|Il tire le traîneau du père Noël
BISON|Grand bovin des plaines
CHAUVESOURIS|Mammifère volant
RAT|Rongeur des égouts
HAMSTER|Il fait tourner sa roue
COBAYE|Cochon d'Inde
FURET|Petit carnivore joueur
BELETTE|Petit mustélidé au pelage brun
VIPERE|Serpent venimeux de France
COBRA|Serpent à capuchon
PYTHON|Serpent constricteur
BOA|Serpent qui étouffe ses proies
LEZARD|Petit reptile qui aime le soleil
IGUANE|Gros lézard vert
CAMELEON|Il change de couleur
GECKO|Lézard qui marche au plafond
CRAPAUD|Cousin pustuleux de la grenouille
SALAMANDRE|Amphibien noir et jaune
SAUMON|Poisson qui remonte les rivières
THON|Grand poisson des conserves
SARDINE|Petit poisson en boîte
TRUITE|Poisson de rivière tacheté
CARPE|Poisson muet par excellence
BROCHET|Poisson carnassier d'eau douce
ANGUILLE|Poisson en forme de serpent
RAIE|Poisson plat en losange
ESPADON|Poisson au long rostre
MEDUSE|Animal marin gélatineux qui pique
CORAIL|Animal qui forme des récifs
ETOILEDEMER|Animal marin à cinq bras (en un mot)
OURSIN|Boule d'épines marine
HOMARD|Crustacé aux grosses pinces
CREVETTE|Petit crustacé rose
MOULE|Coquillage noir
HUITRE|Coquillage qui peut cacher une perle
CALMAR|Céphalopode des beignets à la romaine
SEICHE|Elle a un os et de l'encre
COCCINELLE|Insecte rouge à points noirs
GUEPE|Insecte rayé qui pique
FRELON|Grosse guêpe
MOUCHE|Insecte agaçant qui bourdonne
MOUSTIQUE|Il pique la nuit
CRIQUET|Insecte sauteur des prairies
CIGALE|Elle chante tout l'été
LIBELLULE|Insecte aux quatre ailes au-dessus de l'eau
SCARABEE|Insecte sacré en Égypte
LUCIOLE|Insecte qui brille la nuit
CHENILLE|Futur papillon
TERMITE|Insecte qui mange le bois
SCORPION|Il a un dard au bout de la queue
LIMACE|Escargot sans coquille
VER|Il vit dans la terre
TYRANNOSAURE|Roi des dinosaures (abrégé T-rex)
DIPLODOCUS|Dinosaure au très long cou
TRICERATOPS|Dinosaure à trois cornes
SABRE|Arme d'officier, ou tigre à dents de…
POUSSETTE|On y promène bébé
BIBERON|Bébé y boit son lait
TETINE|Bébé la suce
COUCHE|Bébé en porte une
DOUDOU|Peluche préférée des enfants
TOBOGGAN|On y glisse au parc
BALANCOIRE|Jeu de jardin pour se balancer
TOUPIE|Jouet qui tourne
CERFVOLANT|On le fait voler au bout d'un fil
PUZZLE|Jeu de pièces à assembler
POUPEE|Jouet en forme de bébé
PELUCHE|Jouet tout doux
LEGO|Petites briques à assembler
BILLE|Petite boule de verre
DOMINO|Pièce rectangulaire à points
ECHECS|Jeu du roi et de la reine
DAMES|Jeu de pions sur damier
BELOTE|Jeu de cartes avec atout
TAROT|Jeu de cartes avec l'excuse
UNO|Jeu de cartes où il faut crier son nom
YAMS|Jeu de cinq dés
BINGO|On le crie quand la grille est pleine
LOTO|Jeu de tirage de numéros
TOMBOLA|Loterie de kermesse
DE|Petit cube à six faces
CARTES|Jeu de 52
MANETTE|On la tient pour jouer à la console
CONSOLE|Machine à jeux vidéo
NIVEAU|Étape d'un jeu vidéo
JOYSTICK|Manche à balai de jeu
PIXEL|Point d'une image numérique
CLIC|Action de la souris
EMAIL|Courrier électronique
INTERNET|Le réseau des réseaux
WIFI|Connexion sans fil
SELFIE|Photo de soi-même
EMOJI|Petit smiley
APPLI|Programme pour smartphone
TABLETTE|Écran tactile, ou plaque de chocolat
CASQUE|Il protège la tête, ou diffuse la musique
CAMERA|Elle filme
PHOTO|Image prise avec un appareil
RADIO|On l'écoute dans la voiture
TELE|Petit écran du salon
ROBINET|Il fait couler l'eau
BAIGNOIRE|On s'y prélasse dans le bain
DOUCHE|On s'y lave debout
SAVON|Il mousse
SERVIETTE|Pour s'essuyer
BROSSE|Pour les dents ou les cheveux
PEIGNE|Pour se coiffer
OREILLER|On y pose la tête
COUETTE|Elle tient chaud la nuit
ARMOIRE|Grand meuble à vêtements
CANAPE|On s'y affale devant la télé
FAUTEUIL|Siège à accoudoirs
TAPISSERIE|Elle couvre les murs
ESCALIER|Il relie les étages
ASCENSEUR|Il monte et descend sans effort
CAVE|Pièce sous la maison
GRENIER|Pièce sous le toit
GARAGE|On y range la voiture
CHEMINEE|On y fait du feu
BALCON|Petite terrasse en hauteur
VOLET|Il ferme la fenêtre de l'extérieur
CLE|Elle ouvre la serrure
SERRURE|On y glisse la clé
SONNETTE|Elle annonce les visiteurs
BOUGIE|Elle éclaire avec une flamme
CASSEROLE|Ustensile pour faire bouillir
POELE|On y fait les crêpes
FOURCHETTE|Couvert à dents
CUILLERE|Couvert pour la soupe
COUTEAU|Il coupe
ASSIETTE|On y sert le plat
VERRE|On y boit
BOL|On y prend le petit-déjeuner
TASSE|Pour le café ou le thé
THEIERE|Elle sert le thé
PLATEAU|Pour servir, ou paysage plat
FOUR|Il cuit les gâteaux
FRIGO|Il garde les aliments au frais
MIXEUR|Il fait les smoothies
LOUCHE|Grande cuillère à soupe
FOUET|Pour monter les blancs en neige
PASSOIRE|Pour égoutter les pâtes
SALADIER|Grand bol pour la salade
BAGUETTE|Pain long, ou bâton de magicien
CROISSANT|Viennoiserie en forme de lune
BRIOCHE|Pain sucré et moelleux
MADELEINE|Petit gâteau de Proust
ECLAIR|Pâtisserie allongée, ou lumière d'orage
MACARON|Petit biscuit coloré à la ganache
TARTE|Pâtisserie à fond de pâte
BEIGNET|Pâte frite et sucrée
GAUFRE|Pâtisserie quadrillée
PANCAKE|Crêpe épaisse américaine
MIEL|Les abeilles le fabriquent
CONFITURE|Fruits cuits au sucre
NUTELLA|Pâte à tartiner célèbre
YAOURT|Lait fermenté en pot
CREME|Elle peut être fraîche ou chantilly
OEUF|La poule le pond
JAMBON|Charcuterie du sandwich
SAUCISSE|Elle grille au barbecue
STEAK|Tranche de bœuf
POULET|Volaille rôtie du dimanche
FRITES|Bâtonnets de pommes de terre frits
PUREE|Pommes de terre écrasées
RIZ|Céréale des sushis
PATES|Spaghetti, penne, farfalle
SOUPE|Plat liquide et chaud
OMELETTE|Œufs battus et cuits
SANDWICH|Pain garni
BURGER|Steak entre deux pains ronds
KEBAB|Sandwich à la viande grillée
SUSHI|Spécialité japonaise au poisson cru
TACOS|Spécialité mexicaine ou lyonnaise
RACLETTE|Fromage fondu des soirées d'hiver
FONDUE|On y trempe du pain dans le fromage
COUSCOUS|Semoule et légumes du Maghreb
PAELLA|Riz espagnol au safran
LASAGNES|Pâtes en couches gratinées
QUICHE|Tarte salée lorraine
GRATIN|Plat doré au four
CHOU|Légume vert pommé
BROCOLI|Petit arbre vert à manger
EPINARDS|Légume de Popeye
COURGETTE|Légume vert de la ratatouille
AUBERGINE|Légume violet
POIVRON|Légume rouge, jaune ou vert
OIGNON|Il fait pleurer
AIL|Il éloigne les vampires
POIREAU|Légume de la soupe
CONCOMBRE|Légume frais en rondelles
RADIS|Petit légume rouge et piquant
NAVET|Légume, ou film raté
HARICOT|Légume vert ou sec
PETITPOIS|Petites billes vertes (en un mot)
MAIS|Céréale du pop-corn
LENTILLE|Légumineuse, ou verre de contact
CITROUILLE|Courge d'Halloween
POTIRON|Courge orange
ABRICOT|Fruit orange à noyau
PECHE|Fruit à peau duveteuse
PRUNE|Fruit violet à noyau
FIGUE|Fruit du figuier
DATTE|Fruit du palmier
AVOCAT|Fruit du guacamole, ou défenseur
GRENADE|Fruit aux grains rouges
MYRTILLE|Petite baie bleue
FRAMBOISE|Baie rouge et veloutée
MURE|Baie noire des ronces
CASSIS|Petite baie noire
CLEMENTINE|Petit agrume d'hiver
PAMPLEMOUSSE|Gros agrume amer
LITCHI|Fruit exotique à coque rugueuse
PAPAYE|Fruit tropical orange
CHATAIGNE|On la grille en automne
NOISETTE|Fruit sec de l'écureuil
AMANDE|Fruit sec de la pâte d'amande
CACAHUETE|Fruit sec de l'apéro
OLIVE|Fruit de l'huile
VINAIGRE|Condiment acide
MOUTARDE|Condiment de Dijon
KETCHUP|Sauce tomate sucrée
MAYONNAISE|Sauce aux œufs et à l'huile
POIVRE|Épice noire en grains
SAFRAN|Épice rouge très chère
CANNELLE|Épice en bâton
VANILLE|Gousse parfumée
MENTHE|Herbe fraîche du mojito
BASILIC|Herbe du pesto
PERSIL|Herbe verte des plats
THYM|Herbe de Provence
JUS|Boisson de fruits pressés
SIROP|On le mélange à l'eau
SODA|Boisson gazeuse sucrée
LIMONADE|Boisson gazeuse citronnée
BIERE|Boisson à la mousse
VIN|Boisson de raisin fermenté
CHAMPAGNE|Bulles des fêtes
CIDRE|Boisson de pommes de Normandie
COCKTAIL|Mélange de boissons
TISANE|Infusion de plantes
CHAPEAU|Couvre-chef
CASQUETTE|Couvre-chef à visière
BONNET|Couvre-chef de laine
ECHARPE|Elle se porte autour du cou
GANTS|Ils protègent les mains
MANTEAU|Vêtement chaud d'hiver
PULL|Tricot à enfiler
CHEMISE|Vêtement à boutons et col
ROBE|Vêtement d'une pièce
JUPE|Vêtement serré à la taille
PANTALON|Vêtement à deux jambes
SHORT|Pantalon court
JEAN|Pantalon en toile bleue
CRAVATE|Elle se noue au cou
CEINTURE|Elle tient le pantalon
CHAUSSETTE|Elle va dans la chaussure
BOTTE|Chaussure montante
BASKET|Chaussure de sport, ou sport de panier
SANDALE|Chaussure d'été ouverte
PANTOUFLE|Chaussure d'intérieur
PYJAMA|On le porte pour dormir
MAILLOT|Vêtement de bain ou de sport
LUNETTES|Elles corrigent la vue
MONTRE|Elle donne l'heure au poignet
BAGUE|Bijou du doigt
COLLIER|Bijou du cou
BRACELET|Bijou du poignet
PARAPLUIE|On l'ouvre quand il pleut
SAC|On le porte à l'épaule
VALISE|On y range ses habits en voyage
PORTEFEUILLE|Il contient billets et cartes
MONNAIE|Pièces dans la poche
EURO|Monnaie européenne
DOLLAR|Monnaie américaine
BANQUE|On y dépose son argent
CREDIT|Prêt d'argent
FACTURE|Note à payer
PRIX|Ce que coûte une chose
SOLDES|Période de réductions
CADEAU|On l'offre avec un ruban
FETE|Célébration joyeuse
ANNIVERSAIRE|Jour où l'on souffle les bougies
NOEL|Fête du 25 décembre
PAQUES|Fête des œufs en chocolat
CARNAVAL|Fête des déguisements
MARIAGE|Union de deux époux
VACANCES|Période sans travail
VOYAGE|Déplacement lointain
PASSEPORT|Document pour voyager
AEROPORT|Les avions y décollent
GARE|Les trains s'y arrêtent
PORT|Les bateaux y accostent
HOTEL|On y dort en voyage
CAMPING|Vacances sous la tente
TENTE|Abri de toile
VALLEE|Creux entre les montagnes
COLLINE|Petite montagne
FALAISE|Paroi rocheuse au bord de la mer
GROTTE|Cavité dans la roche
DESERT|Étendue de sable sans eau
OASIS|Point d'eau dans le désert
DUNE|Colline de sable
GLACIER|Fleuve de glace, ou marchand de glaces
BANQUISE|Glace flottante du pôle
CASCADE|Chute d'eau
SOURCE|Là où naît la rivière
MARAIS|Terrain gorgé d'eau
PRAIRIE|Étendue d'herbe
CAMPAGNE|Le contraire de la ville
VILLAGE|Petite commune
VILLE|Grande agglomération
CAPITALE|Ville principale d'un pays
PAYS|Nation
FRONTIERE|Limite entre deux pays
CARTE|Plan d'un territoire
BOUSSOLE|Elle indique le nord
NORD|Point cardinal du pôle
SUD|Point cardinal opposé au nord
EST|Là où le soleil se lève
OUEST|Là où le soleil se couche
ECLAIR|Lumière de l'orage
TONNERRE|Bruit de l'orage
TEMPETE|Vent très violent
BROUILLARD|Nuage au ras du sol
GRELE|Pluie de glaçons
ROSEE|Gouttes du matin sur l'herbe
CANICULE|Grosse chaleur d'été
GEL|Eau qui devient glace
SAISON|Le printemps en est une
AUBE|Tout début du jour
CREPUSCULE|Tombée du jour
MIDI|Le milieu de la journée
MINUIT|Le milieu de la nuit
SEMAINE|Sept jours
MOIS|Environ trente jours
SIECLE|Cent ans
CALENDRIER|Il montre les jours de l'année
AGENDA|Carnet des rendez-vous
REVEIL|Il sonne le matin
SABLIER|Il mesure le temps avec du sable
GALAXIE|Ensemble immense d'étoiles
COMETE|Astre à longue queue
METEORE|Étoile filante
ASTRONAUTE|Il voyage dans l'espace
SATELLITE|Il tourne autour d'une planète
TELESCOPE|Pour observer les étoiles
MARS|La planète rouge
VENUS|Planète la plus chaude
JUPITER|La plus grosse planète
SATURNE|Planète aux anneaux
MERCURE|Planète la plus proche du soleil
NEPTUNE|Planète bleue lointaine
ATOME|Plus petite partie d'un élément
AIMANT|Il attire le fer
MOTEUR|Il fait avancer la voiture
ESSENCE|Carburant
BATTERIE|Elle stocke l'électricité, ou instrument à percussion
AMPOULE|Elle éclaire, ou cloque au pied
PILE|Source d'énergie de la télécommande
LASER|Rayon de lumière concentrée
MICROSCOPE|Pour voir l'infiniment petit
LOUPE|Elle grossit
VACCIN|Il protège des maladies
VIRUS|Microbe qui rend malade
FIEVRE|Température trop haute
RHUME|On se mouche beaucoup
HOPITAL|Lieu où l'on soigne
PHARMACIE|On y achète des médicaments
DENTISTE|Il soigne les dents
INFIRMIER|Il fait les piqûres
VETERINAIRE|Médecin des animaux
AVOCAT|Il défend au tribunal
JUGE|Il rend la justice
PROFESSEUR|Il enseigne
ELEVE|Il apprend à l'école
JARDINIER|Il soigne les plantes
FERMIER|Il travaille à la ferme
PECHEUR|Il attrape des poissons
BOUCHER|Il vend la viande
COIFFEUR|Il coupe les cheveux
PLOMBIER|Il répare les fuites
ELECTRICIEN|Il installe le courant
MACON|Il construit les murs
ARCHITECTE|Il dessine les plans
JOURNALISTE|Il écrit les nouvelles
ACTEUR|Il joue dans les films
CHANTEUR|Il chante sur scène
ECRIVAIN|Il écrit des livres
ASTRONOME|Il étudie les étoiles
DETECTIVE|Il mène l'enquête
ESPION|Agent secret
SOLDAT|Militaire
MARIN|Il navigue sur les mers
CAPITAINE|Chef du navire
ROI|Il porte la couronne
REINE|Épouse du roi
PRINCE|Fils du roi
EMPEREUR|Napoléon en était un
PHARAON|Roi d'Égypte
CHEVALIER|Il porte une armure
GUERRIER|Combattant
VIKING|Guerrier scandinave
SAMOURAI|Guerrier japonais
NINJA|Combattant japonais furtif
COWBOY|Gardien de vaches du Far West
SHERIF|Il fait régner l'ordre au Far West
INDIEN|Habitant de l'Inde
ARMURE|Protection de métal du chevalier
CASQUE|Protection de la tête
ARC|Il lance des flèches
FLECHE|Projectile de l'arc
LANCE|Longue arme pointue
HACHE|Elle coupe le bois
MARTEAU|Il enfonce les clous
CLOU|On le plante avec un marteau
VIS|On la serre avec un tournevis
TOURNEVIS|Outil pour les vis
SCIE|Elle coupe le bois en va-et-vient
PELLE|Outil pour creuser
RATEAU|Outil pour ramasser les feuilles
ECHELLE|Pour monter en hauteur
CORDE|On peut y faire des nœuds
CHAINE|Suite d'anneaux de métal
CADENAS|Il ferme avec une clé ou un code
TRESORIER|Il gère l'argent d'une association
LINGOT|Barre d'or
DIAMANT|La pierre la plus dure
RUBIS|Pierre précieuse rouge
EMERAUDE|Pierre précieuse verte
SAPHIR|Pierre précieuse bleue
PERLE|Elle naît dans une huître
OR|Métal jaune précieux
FER|Métal qui rouille
CUIVRE|Métal rouge des fils électriques
PLOMB|Métal lourd et gris
BRONZE|Médaille de la troisième place
TROPHEE|Récompense du vainqueur
PODIUM|On y monte après la victoire
CHAMPION|Le meilleur de tous
VICTOIRE|Le contraire de la défaite
DEFAITE|Le contraire de la victoire
EQUIPE|Groupe de joueurs
STADE|Terrain de sport entouré de tribunes
PISCINE|Bassin pour nager
GYMNASE|Salle de sport
MARATHON|Course de 42 kilomètres
SPRINT|Course très rapide
SAUT|Bond en l'air
BOXE|Sport de combat aux poings
KARATE|Art martial japonais
ESCRIME|Sport avec un fleuret
GOLF|On y frappe une balle vers un trou
VOILE|Sport à bord d'un bateau poussé par le vent
SURF|On glisse sur les vagues
SKATE|Planche à roulettes
ROLLER|Patin à roulettes
VOLLEY|Sport de filet avec un ballon
HANDBALL|Sport de ballon joué à la main
CYCLISME|Sport à vélo
ALPINISME|Ascension des sommets
PLONGEE|Exploration sous l'eau
PECHE|Activité au bord de l'eau avec une canne
CHASSE|Poursuite du gibier
RANDONNEE|Longue promenade à pied
YOGA|Gymnastique douce indienne
TRAMPOLINE|On y fait des sauts
SIFFLET|L'arbitre souffle dedans
FILET|Il sépare les deux camps au tennis
RAQUETTE|Pour frapper la balle au tennis
TROMPETTE|Instrument de jazz en cuivre
SAXOPHONE|Instrument de jazz en laiton
ACCORDEON|Piano à bretelles
HARPE|Instrument à cordes des anges
BATTERIE|Instrument à fûts et cymbales
CLARINETTE|Instrument à anche
XYLOPHONE|Instrument à lames frappées
MICRO|Il amplifie la voix
CONCERT|Spectacle musical
OPERA|Spectacle chanté
ORCHESTRE|Ensemble de musiciens
CHORALE|Groupe de chanteurs
RYTHME|Cadence de la musique
MELODIE|Suite de notes agréable
REFRAIN|Partie répétée d'une chanson
DISQUE|Support de musique
JAZZ|Musique de La Nouvelle-Orléans
ROCK|Musique à guitares électriques
RAP|Musique parlée et rythmée
REGGAE|Musique de Bob Marley
TANGO|Danse argentine
VALSE|Danse à trois temps
SALSA|Danse latine, ou sauce piquante
BALLET|Spectacle de danse classique
PEINTURE|Art des tableaux
SCULPTURE|Art de la statue
DESSIN|Art du crayon
TABLEAU|Œuvre peinte, ou surface noire de l'école
STATUE|Sculpture en pied
MUSEE|On y expose des œuvres
POEME|Texte en vers
ROMAN|Long récit en prose
CONTE|Histoire pour enfants
FABLE|Histoire avec une morale
BD|Bande dessinée (abrégé)
HEROS|Personnage principal courageux
MECHANT|L'ennemi du héros
SECRET|Ce qu'on ne doit pas dire
MYSTERE|Énigme non résolue
ENIGME|Devinette difficile
INDICE|Il aide à trouver la solution
LABYRINTHE|On s'y perd
MIRAGE|Illusion du désert
REVE|Ce qu'on voit en dormant
CAUCHEMAR|Mauvais rêve
SOMMEIL|État de celui qui dort
SIESTE|Petit somme de l'après-midi
FAIM|Envie de manger
SOIF|Envie de boire
FATIGUE|Envie de dormir
COLERE|Grand énervement
TRISTESSE|Le contraire de la joie
SURPRISE|Ce qu'on ne prévoyait pas
COURAGE|Qualité du brave
PATIENCE|Elle permet d'attendre
SAGESSE|Qualité du vieux sage
HONTE|Sentiment après une bêtise
FIERTE|Sentiment après une réussite
ESPOIR|Il fait vivre
BONHEUR|État de grande joie
CALME|Le contraire de l'agitation
SILENCE|Absence de bruit
BRUIT|Son désagréable
CRI|Son poussé très fort
CHUCHOTER|Parler tout bas
CHANTER|Faire de la musique avec sa voix
DANSER|Bouger en rythme
COURIR|Aller très vite à pied
NAGER|Avancer dans l'eau
SAUTER|Quitter le sol d'un bond
VOLER|Se déplacer dans les airs, ou dérober
DORMIR|Se reposer les yeux fermés
MANGER|Se nourrir
BOIRE|Avaler un liquide
LIRE|Parcourir un livre
ECRIRE|Tracer des lettres
JOUER|S'amuser
GAGNER|Remporter la partie
PERDRE|Ne pas gagner
MISER|Parier de l'argent
PARIER|Jouer de l'argent sur un résultat
GRATTER|Ce qu'on fait au ticket de loterie
TIRAGE|Moment où les numéros sortent
LOTERIE|Jeu de hasard à billets
TICKET|Billet à gratter
BANQUIER|Il tient la banque au jeu
BLACKJACK|Jeu de cartes du 21
BACCARA|Jeu de cartes de James Bond
DOUBLE|Deux fois plus
TRIPLE|Trois fois plus
FORTUNE|Grosse somme d'argent
MILLION|Mille fois mille
RICHE|Qui a beaucoup d'argent
PAUVRE|Qui n'a pas d'argent
ECONOMIE|Argent mis de côté
TIRELIRE|Cochon qui garde les pièces
COFFREFORT|Il protège les objets de valeur (en un mot)
BRUNDLE|Monnaie du Casino Chibouk
CHIBOUK|Le nom de notre casino
BANANERAIE|Plantation de bananes
SINGERIE|Grimace de singe
MACAQUE|Singe d'Asie
CAPUCIN|Singe d'Amérique du Sud
GIBBON|Singe aux très longs bras
MANDRILL|Singe au museau coloré
TAMARIN|Petit singe à moustache
OUISTITI|Petit singe
TARZAN|Homme élevé par les singes
KINGKONG|Gorille géant du cinéma (en un mot)
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
