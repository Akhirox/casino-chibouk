// Mots pour le jeu de frappe (français courant). Facile : mots courts sans accent ; normal : mots courants ; difficile : mots longs et accentués.
export const WORDS_EASY = `le la les un une des de du et en au aux on il elle nous vous ils ou mais donc car ni que qui quoi dont sur sous dans par pour avec sans chez vers entre
avant apres tout tous toute bien mal plus moins tres trop peu beaucoup assez encore deja jamais toujours souvent parfois ici voila oui non merci bonjour salut
jour nuit matin soir midi heure temps an mois semaine date fois moment main pied tete bras jambe dos nez bouche dent oeil yeux cou ventre coeur
chat chien loup ours singe lion tigre vache cheval mouton poule coq lapin souris rat oiseau poisson canard cochon zebre girafe panda koala
pain lait eau vin sel sucre riz pomme poire fraise citron orange banane miel jus soupe sel beurre oeuf viande lard pates frite glace gateau
rouge bleu vert jaune noir blanc gris rose brun violet clair fonce grand petit long court gros fin haut bas neuf vieux jeune beau joli
maison porte mur toit table chaise lit lampe fenetre jardin rue route ville pays mer lac riviere mont plage foret champ arbre fleur herbe
aller venir faire dire voir savoir pouvoir vouloir devoir prendre mettre donner parler aimer manger boire dormir jouer lire rire courir sauter
pere mere frere soeur fils fille ami amie roi reine papa maman bebe enfant homme femme gens monde nom mot livre film jeu carte balle velo
sac cle sol ciel vent pluie neige feu nuage soleil lune etoile froid chaud doux dur vrai faux bon mauvais calme fort faible vite lent`.split(/\s+/).filter(Boolean);

export const WORDS_NORMAL = `maison voiture travail famille histoire question exemple moment personne semaine probleme raison partie groupe nombre service
attention ordinateur telephone musique cuisine voyage vacances bureau ecole classe lecon devoir reponse journal article message
regarder ecouter comprendre apprendre chercher trouver commencer continuer terminer arriver partir rester tomber monter descendre
ouvrir fermer acheter vendre payer gagner perdre oublier penser croire sembler devenir revenir tenir porter montrer laisser rendre
jungle banane cocotier perroquet crocodile serpent liane cascade volcan tresor pirate aventure explorateur boussole carte singe
casino jeton roulette machine jackpot victoire defaite partie mise gain record classement joueur equipe adversaire tournoi score
heureux content triste fatigue presse calme curieux genial terrible incroyable facile difficile simple rapide lourd leger propre
toujours jamais souvent ensemble pourtant cependant ailleurs autour dessus dessous dedans dehors bientot longtemps maintenant
montagne campagne village quartier chemin pont foret desert ocean ile plaine colline vallee riviere fleuve chateau eglise marche
cheval mouton lapin renard ecureuil hibou aigle dauphin baleine requin tortue grenouille papillon abeille fourmi araignee
chocolat fromage salade poulet tomate carotte haricot oignon pomme fraise cerise abricot melon ananas biscuit tartine confiture
matin journee soiree minute seconde saison printemps automne hiver annee siecle anniversaire weekend horloge calendrier
couleur lumiere ombre bruit silence odeur chaleur fraicheur image photo dessin peinture sculpture chanson danse theatre cinema
docteur infirmier pompier policier boulanger facteur cuisinier professeur eleve artiste pilote marin fermier jardinier
pantalon chemise chaussure chapeau manteau echarpe ceinture lunettes montre bague collier valise parapluie bouteille assiette`.split(/\s+/).filter(Boolean);

export const WORDS_HARD = `extraordinaire développement gouvernement responsabilité particulièrement immédiatement environnement connaissance
expérience différence intéressant néanmoins évidemment probablement événement caractéristique communication électricité
réfrigérateur hippopotame anticonstitutionnel enthousiasme mélancolie bibliothèque météorologie orthographe psychologie
architecture chrysanthème rhinocéros ornithorynque paléontologie kaléidoscope labyrinthe hiéroglyphe métamorphose
coïncidence naïveté aiguë Noël ambiguë cœur sœur œuvre œillet bœuf nœud vœu manœuvre maïs égoïste héroïque
préférence élégance événementiel désagréable irrésistible inévitable incompréhensible indépendance reconnaissance
infrastructure télécommunication applaudissement accroissement émerveillement remerciement éblouissement épanouissement
mystérieux généreux délicieux silencieux spectaculaire extravagant phénoménal stratosphère hémisphère atmosphère
cacahuète perroquet écureuil chauve-souris arc-en-ciel porte-monnaie aujourd'hui quelqu'un presqu'île grand-mère
où là déjà voilà à-peu-près après-midi c'est-à-dire peut-être vis-à-vis tête-à-tête week-end rendez-vous
fenêtre forêt château hôpital île goût août coût fraîcheur théâtre gâteau pâtisserie bientôt plutôt aussitôt
créativité sérénité générosité curiosité électroménager télévision vidéoprojecteur hélicoptère aéroport équateur`.split(/\s+/).filter(Boolean);
