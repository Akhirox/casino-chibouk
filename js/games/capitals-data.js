// Pays et capitales (noms français). Niveau : 1 = très connu, 2 = classique, 3 = pour les experts.
// Les pays dont la capitale porte le même nom (Luxembourg, Monaco, Singapour…) ou dont la capitale est ambiguë sont exclus.
export const CAPITALS = [
  // Europe
  ['France', 'Paris', 'eu', 1], ['Allemagne', 'Berlin', 'eu', 1], ['Italie', 'Rome', 'eu', 1], ['Espagne', 'Madrid', 'eu', 1],
  ['Royaume-Uni', 'Londres', 'eu', 1], ['Portugal', 'Lisbonne', 'eu', 1], ['Belgique', 'Bruxelles', 'eu', 1], ['Pays-Bas', 'Amsterdam', 'eu', 1],
  ['Autriche', 'Vienne', 'eu', 1], ['Grèce', 'Athènes', 'eu', 1], ['Irlande', 'Dublin', 'eu', 1], ['Russie', 'Moscou', 'eu', 1],
  ['Pologne', 'Varsovie', 'eu', 1], ['Suède', 'Stockholm', 'eu', 1], ['Norvège', 'Oslo', 'eu', 1], ['Danemark', 'Copenhague', 'eu', 1],
  ['République tchèque', 'Prague', 'eu', 1], ['Finlande', 'Helsinki', 'eu', 2], ['Suisse', 'Berne', 'eu', 2], ['Hongrie', 'Budapest', 'eu', 2],
  ['Ukraine', 'Kiev', 'eu', 2], ['Roumanie', 'Bucarest', 'eu', 2], ['Bulgarie', 'Sofia', 'eu', 2], ['Croatie', 'Zagreb', 'eu', 2],
  ['Serbie', 'Belgrade', 'eu', 2], ['Slovaquie', 'Bratislava', 'eu', 2], ['Islande', 'Reykjavik', 'eu', 2], ['Biélorussie', 'Minsk', 'eu', 2],
  ['Bosnie-Herzégovine', 'Sarajevo', 'eu', 2], ['Turquie', 'Ankara', 'eu', 2], ['Slovénie', 'Ljubljana', 'eu', 3], ['Estonie', 'Tallinn', 'eu', 3],
  ['Lettonie', 'Riga', 'eu', 3], ['Lituanie', 'Vilnius', 'eu', 3], ['Moldavie', 'Chisinau', 'eu', 3], ['Albanie', 'Tirana', 'eu', 3],
  ['Macédoine du Nord', 'Skopje', 'eu', 3], ['Monténégro', 'Podgorica', 'eu', 3], ['Malte', 'La Valette', 'eu', 3], ['Chypre', 'Nicosie', 'eu', 3],
  ['Géorgie', 'Tbilissi', 'eu', 3], ['Arménie', 'Erevan', 'eu', 3], ['Azerbaïdjan', 'Bakou', 'eu', 3],
  // Amériques
  ['États-Unis', 'Washington', 'am', 1], ['Mexique', 'Mexico', 'am', 1], ['Argentine', 'Buenos Aires', 'am', 1], ['Cuba', 'La Havane', 'am', 1],
  ['Canada', 'Ottawa', 'am', 2], ['Brésil', 'Brasilia', 'am', 2], ['Chili', 'Santiago', 'am', 2], ['Pérou', 'Lima', 'am', 2],
  ['Colombie', 'Bogota', 'am', 2], ['Venezuela', 'Caracas', 'am', 2], ['Haïti', 'Port-au-Prince', 'am', 2], ['Équateur', 'Quito', 'am', 3],
  ['Uruguay', 'Montevideo', 'am', 3], ['Paraguay', 'Asuncion', 'am', 3], ['Jamaïque', 'Kingston', 'am', 3], ['Costa Rica', 'San José', 'am', 3],
  ['Nicaragua', 'Managua', 'am', 3], ['Honduras', 'Tegucigalpa', 'am', 3], ['République dominicaine', 'Saint-Domingue', 'am', 3],
  // Asie et Moyen-Orient
  ['Japon', 'Tokyo', 'as', 1], ['Chine', 'Pékin', 'as', 1], ['Corée du Sud', 'Séoul', 'as', 1], ['Thaïlande', 'Bangkok', 'as', 1],
  ['Inde', 'New Delhi', 'as', 2], ['Corée du Nord', 'Pyongyang', 'as', 2], ['Viêt Nam', 'Hanoï', 'as', 2], ['Indonésie', 'Jakarta', 'as', 2],
  ['Philippines', 'Manille', 'as', 2], ['Malaisie', 'Kuala Lumpur', 'as', 2], ['Afghanistan', 'Kaboul', 'as', 2], ['Iran', 'Téhéran', 'as', 2],
  ['Irak', 'Bagdad', 'as', 2], ['Arabie saoudite', 'Riyad', 'as', 2], ['Syrie', 'Damas', 'as', 2], ['Liban', 'Beyrouth', 'as', 2],
  ['Qatar', 'Doha', 'as', 2], ['Népal', 'Katmandou', 'as', 2], ['Pakistan', 'Islamabad', 'as', 3], ['Jordanie', 'Amman', 'as', 3],
  ['Émirats arabes unis', 'Abou Dabi', 'as', 3], ['Bangladesh', 'Dacca', 'as', 3], ['Mongolie', 'Oulan-Bator', 'as', 3], ['Cambodge', 'Phnom Penh', 'as', 3],
  ['Laos', 'Vientiane', 'as', 3], ['Birmanie', 'Naypyidaw', 'as', 3], ['Kazakhstan', 'Astana', 'as', 3], ['Ouzbékistan', 'Tachkent', 'as', 3],
  ['Yémen', 'Sanaa', 'as', 3], ['Oman', 'Mascate', 'as', 3],
  // Afrique
  ['Égypte', 'Le Caire', 'af', 1], ['Algérie', 'Alger', 'af', 1], ['Tunisie', 'Tunis', 'af', 1], ['Maroc', 'Rabat', 'af', 2],
  ['Sénégal', 'Dakar', 'af', 2], ['Mali', 'Bamako', 'af', 2], ['Kenya', 'Nairobi', 'af', 2], ['Éthiopie', 'Addis-Abeba', 'af', 2],
  ['Cameroun', 'Yaoundé', 'af', 2], ['République démocratique du Congo', 'Kinshasa', 'af', 2], ['Libye', 'Tripoli', 'af', 2], ['Burkina Faso', 'Ouagadougou', 'af', 2],
  ['Côte d\'Ivoire', 'Yamoussoukro', 'af', 3], ['Nigeria', 'Abuja', 'af', 3], ['Afrique du Sud', 'Pretoria', 'af', 3], ['Madagascar', 'Antananarivo', 'af', 3],
  ['Ghana', 'Accra', 'af', 3], ['Soudan', 'Khartoum', 'af', 3], ['Niger', 'Niamey', 'af', 3], ['Tanzanie', 'Dodoma', 'af', 3],
  ['Ouganda', 'Kampala', 'af', 3], ['Angola', 'Luanda', 'af', 3], ['Gabon', 'Libreville', 'af', 3], ['Rwanda', 'Kigali', 'af', 3],
  ['Mauritanie', 'Nouakchott', 'af', 3], ['Guinée', 'Conakry', 'af', 3], ['Togo', 'Lomé', 'af', 3], ['Zimbabwe', 'Harare', 'af', 3],
  ['Mozambique', 'Maputo', 'af', 3], ['République du Congo', 'Brazzaville', 'af', 3], ['Tchad', 'N\'Djaména', 'af', 3],
  // Océanie
  ['Australie', 'Canberra', 'oc', 2], ['Nouvelle-Zélande', 'Wellington', 'oc', 2], ['Fidji', 'Suva', 'oc', 3], ['Papouasie-Nouvelle-Guinée', 'Port Moresby', 'oc', 3],
];

// Autres écritures acceptées en mode expert (en plus des fautes de frappe légères)
export const ALIASES = {
  'États-Unis': ['USA', 'US', 'Etats Unis d Amerique', 'Amerique'], 'Royaume-Uni': ['Angleterre', 'Grande-Bretagne', 'UK'],
  'Pays-Bas': ['Hollande'], 'République tchèque': ['Tchéquie', 'Republique Tcheque'], 'Birmanie': ['Myanmar'],
  'Macédoine du Nord': ['Macédoine'], 'République démocratique du Congo': ['RDC', 'RD Congo', 'Congo Kinshasa'],
  'République du Congo': ['Congo', 'Congo Brazzaville'], 'Émirats arabes unis': ['EAU', 'Emirats', 'Emirats arabes'],
  'Biélorussie': ['Bélarus', 'Belarus'], 'Viêt Nam': ['Vietnam'], 'Bosnie-Herzégovine': ['Bosnie'],
  'Papouasie-Nouvelle-Guinée': ['Papouasie'], 'Fidji': ['Fiji', 'Iles Fidji'], 'Moldavie': ['Moldova'], 'Turquie': ['Turkiye'],
  'Arabie saoudite': ['Arabie'], 'Corée du Sud': ['Coree sud'], 'Corée du Nord': ['Coree nord'], 'Nouvelle-Zélande': ['NZ'],
  'Kiev': ['Kyiv'], 'Pékin': ['Beijing'], 'New Delhi': ['Delhi'], 'Mexico': ['Mexico City'], 'Washington': ['Washington DC'],
  'Dacca': ['Dhaka'], 'Oulan-Bator': ['Ulaanbaatar', 'Ulan Bator'], 'Naypyidaw': ['Naypyitaw', 'Nay Pyi Taw'],
  'Chisinau': ['Kichinev'], 'Abou Dabi': ['Abu Dhabi', 'Abou Dhabi'], 'Tachkent': ['Tashkent'], 'Sanaa': ['Sana a'],
  'Mascate': ['Muscat'], 'Addis-Abeba': ['Addis Ababa', 'Addis'], 'Riyad': ['Riyadh'], 'Erevan': ['Yerevan'],
  'Tbilissi': ['Tbilisi'], 'Bakou': ['Baku'], 'Saint-Domingue': ['Santo Domingo'], 'La Havane': ['Havana'],
  'La Valette': ['Valletta'], 'Katmandou': ['Kathmandu'], 'Bagdad': ['Baghdad'], 'Kaboul': ['Kabul'],
  'Varsovie': ['Warszawa', 'Warsaw'], 'Copenhague': ['Copenhagen'], 'Lisbonne': ['Lisboa', 'Lisbon'], 'Bruxelles': ['Brussels'],
  'Vienne': ['Wien', 'Vienna'], 'Moscou': ['Moskva', 'Moscow'], 'Athènes': ['Athens'], 'Londres': ['London'], 'Berne': ['Bern'],
  'Bucarest': ['Bucuresti', 'Bucharest'], 'Belgrade': ['Beograd'], 'Nicosie': ['Nicosia'], 'N\'Djaména': ['Ndjamena'],
  'Port-au-Prince': ['Port au Prince'], 'Phnom Penh': ['Phnom-Penh'], 'Kuala Lumpur': ['KL'], 'Hanoï': ['Hanoi'],
  'Séoul': ['Seoul'], 'Manille': ['Manila'], 'Le Caire': ['Cairo'], 'Alger': ['Algiers'], 'Damas': ['Damascus'],
  'Beyrouth': ['Beirut'], 'Prague': ['Praha'], 'Rome': ['Roma'], 'Pretoria': ['Tshwane'],
};
