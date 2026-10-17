// Le singe conseiller : petites astuces contextuelles sur les fonctionnalités pas évidentes du site
import { CONFIG } from './config.js';
import { monkeySVG } from './art.js';
import { $, esc } from './ui.js';

const CASINO = ['slots', 'blackjack', 'roulette', 'plinko', 'crash', 'tower', 'mines', 'dice', 'hilo', 'keno', 'wheel', 'limbo'];
const CUR = CONFIG.CURRENCY;

// route : page où l'astuce a du sens ('*' = partout) ; when : condition facultative ; go : bouton vers une page
export const TIPS = [
  { id: 'profile', route: ['lobby', 'stats', 'achievements'], when: (w) => !w.p.avatar || !w.p.bio, text: `Personnalise ton profil : une photo (ou un singe au choix) et une petite bio. Les autres joueurs les voient en cliquant sur ton pseudo dans les classements. Et le succès « Carte de visite » rapporte +100 ${CUR} !`, go: ['Mon profil', '#/profile'] },
  { id: 'daily', route: ['*'], when: (w) => w.dailyAvailable(), text: `La roue du jour t'attend : bouton en haut à droite. Reviens chaque jour pour faire monter ta série, jusqu'à ×2 sur le gain !` },
  { id: 'tower-plan', route: ['tower'], text: 'Pour l\'auto de la Tower, clique sur les cases du plateau avant de lancer : tu traces ton parcours étage par étage. « Jusqu\'en haut » le fait grimper les 9 étages.' },
  { id: 'vip-click', route: ['lobby', 'stats', 'profile'], text: 'Clique sur un rang VIP (n\'importe où sur le site) pour voir tous les rangs et leurs avantages : bonus de passage, rakeback et multiplicateur des gains gratuits.' },
  { id: 'ach-sort', route: ['achievements'], text: 'Le menu « Trier » de la page des succès montre les plus rares, ou les derniers obtenus par tout le monde.' },
  { id: 'jp-odds', route: ['slots'], text: 'Le bandeau JACKPOT au-dessus des rouleaux affiche ta chance de le remporter avec ta mise actuelle. Clique dessus pour les détails.' },
  { id: 'global', route: ['stats'], text: 'L\'onglet « Le casino » de la page Stats montre tout ce que les singes ont misé, gagné et dépensé, et le RTP réel de chaque jeu.' },
  { id: 'quests', route: ['lobby'], text: 'Trois quêtes du jour t\'attendent sur l\'accueil (facile, moyenne, difficile). Elles avancent toutes seules pendant que tu joues.' },
  { id: 'vip', route: ['lobby', 'stats'], text: 'Plus tu mises, plus ton rang VIP monte : chaque nouveau rang t\'offre un bonus, et une petite part de chaque mise tombe dans ta cagnotte de rakeback, à récupérer quand tu veux sur l\'accueil.' },
  { id: 'challenge', route: ['lobby'], text: 'Le défi de la jungle change toutes les 15 minutes, pour tout le monde en même temps. Le premier qui le réussit empoche la récompense : regarde le chrono et fonce !' },
  { id: 'jackpot', route: ['slots'], text: 'Le jackpot commun grossit avec chaque spin de la Chibouk Slot, et il peut tomber sur n\'importe quel spin. Plus ta mise est grosse, plus tu as de chances.' },
  { id: 'shop', route: ['lobby', 'profile'], when: (w) => w.balance >= 10000, text: `Tu as des ${CUR} qui dorment ? La boutique propose des cadres d'avatar, des titres, des dos de cartes, des thèmes de slot et des effets de victoire.`, go: ['Boutique', '#/shop'] },
  { id: 'weekly', route: ['ranking'], text: 'Le classement de la semaine compte ton bénéfice du lundi au dimanche : le premier gagne un trophée permanent sur son profil.' },
  { id: 'history', route: CASINO, text: 'L\'onglet « Historique » du classement à côté du jeu montre tes 50 dernières parties.' },
  { id: 'feed', route: ['lobby'], text: '« En direct de la jungle » montre les exploits de tout le monde : gros gains, succès rares, jackpots…' },
  { id: 'menu', route: ['lobby'], text: 'Les jeux sont rangés dans les menus « Casino » et « Gratuit » en haut (en bas sur téléphone).' },
  { id: 'motus', route: ['lobby', 'motus'], text: 'Le mot du jour est le même pour tout le monde. Une fois trouvé, « Copier mon résultat » te donne une grille à envoyer à tes potes, sans révéler le mot.' },
  { id: 'hilo', route: ['hilo'], text: 'Au Hi-Lo, les flèches ↑ et ↓ du clavier servent à parier, et Espace pour miser ou encaisser.' },
  { id: 'keno', route: ['keno'], text: 'Au Keno, le tableau sous la grille montre le gain et la probabilité pour chaque nombre de numéros touchés.' },
  { id: 'higher', route: ['higher'], text: 'Au Plus ou moins, les flèches ↑ et ↓ du clavier répondent plus vite.' },
  { id: 'lobby-fold', route: ['lobby'], text: 'Tu peux replier les catégories de l\'accueil en cliquant sur leur titre. Pratique si tu ne viens que pour les jeux gratuits !' },
  { id: 'achievements', route: ['lobby'], text: `Il y a plein de succès à débloquer, certains bien tordus (perdre 5 mains de blackjack d'affilée…). Chacun rapporte de +100 à +10 000 ${CUR}.`, go: ['Voir les succès', '#/achievements'] },
  { id: 'ach-click', route: ['achievements'], text: 'Clique sur un succès pour voir quels joueurs l\'ont débloqué, et qui l\'a eu en premier.' },
  { id: 'ach-hide', route: ['achievements'], text: 'Coche « Masquer les succès débloqués » pour ne voir que ce qu\'il te reste à faire. Les barres montrent où tu en es.' },
  { id: 'player-card', route: ['ranking', ...CASINO], text: 'Clique sur le pseudo d\'un joueur dans un classement pour voir son profil : photo, bio, jeu préféré et meilleurs succès.' },
  { id: 'tracker', route: CASINO, text: 'Le bouton graphique en haut affiche le suivi de ta session : gains et pertes en direct, même quand tu changes de jeu.' },
  { id: 'auto', route: CASINO, text: 'Les paris automatiques sont sous chaque jeu : un nombre de paris (ou vide pour l\'infini), avec arrêt sur objectif de gain ou limite de perte.' },
  { id: 'send', route: ['lobby', 'ranking'], text: `Tu peux envoyer des ${CUR} à un pote avec l'avion en papier en haut. Il les reçoit en moins de 2 minutes.` },
  { id: 'news', route: ['lobby'], text: 'Les nouveautés de chaque version sont dans le menu de ton pseudo, rubrique « Nouveautés ».' },
  { id: 'sync', route: ['*'], text: `Le petit point à côté de ton solde, c'est la sauvegarde : tes parties partent vers le serveur toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} secondes. Vert = tout est à jour.` },
  { id: 'sound', route: CASINO, text: 'Le son te saoule ? Le haut-parleur en haut le coupe.' },
  { id: 'slot-scatter', route: ['slots'], text: 'Le Totem, c\'est le SCATTER : il paie n\'importe où sur l\'écran, et 3 Totems lancent les tours gratuits avec tous les gains ×2.' },
  { id: 'slot-x2', route: ['slots'], text: 'Le Roi Singe violet, c\'est le WILD ×2 : il remplace n\'importe quel symbole et double le gain de sa ligne. Deux sur la même ligne = ×4 !' },
  { id: 'slot-keys', route: ['slots'], text: 'La barre Espace lance un spin. La « Table des gains » montre les 99 lignes et ce que chaque symbole rapporte avec ta mise.' },
  { id: 'bj-chips', route: ['blackjack'], text: 'Choisis un jeton, puis clique sur MISE, PAIRES ou 21+3 sur le tapis. Clic droit (ou la croix) pour retirer une mise.' },
  { id: 'bj-split', route: ['blackjack'], text: 'Ici on peut séparer n\'importe quelles deux cartes, même un roi et une dame. Jusqu\'à 4 mains !' },
  { id: 'rl-remove', route: ['roulette'], text: 'Clique plusieurs fois sur une case pour empiler tes jetons. Clic droit sur une case pour la vider.' },
  { id: 'cr-auto', route: ['crash'], text: 'Règle un « Encaissement auto » pour sortir pile au multiplicateur voulu, sans avoir à cliquer au bon moment.' },
  { id: 'leave', route: ['tower', 'mines'], text: 'Si tu quittes la page en pleine partie, tes gains sont encaissés automatiquement au palier atteint. Rien n\'est perdu.' },
  { id: 'dice', route: ['dice'], text: 'Plus ta chance est faible, plus le dé paie : 1 % de chance = ×99. Tu peux aussi parier « au-dessus » au lieu de « en dessous ».' },
  { id: 'plinko', route: ['plinko'], text: 'En risque élevé, les coins paient jusqu\'à ×1000… mais le centre paie très peu. À toi de voir !' },
  { id: 'quiz-keys', route: ['capitals', 'movies'], text: 'Au clavier, réponds avec les touches 1 à 4 (ou A à D), puis Entrée pour passer à la question suivante.' },
  { id: 'cap-expert', route: ['capitals'], text: 'Essaie le mode Expert : pas de propositions, il faut écrire la réponse… mais les gains sont doublés !' },
  { id: 'vip-free', route: ['quiz', 'capitals', 'movies', 'flags', 'motus', 'higher', 'breaker', 'queens', 'tango', 'pinpoint', 'sudoku', 'demineur', 'snake', 'memory', 'crossword', 'lobby'], text: 'Ton rang VIP multiplie tous tes gains gratuits : roue du jour, quêtes, quiz, sudoku, snake… De ×1,2 au rang Tamarin jusqu\'à ×10 pour le Roi Singe.' },
  { id: 'queens-x', route: ['queens'], text: 'Queens : glisse le doigt (ou la souris) sur une ligne ou une zone pour la couvrir de croix d\'un coup. Une zone toute petite, c\'est souvent là que tout commence !' },
  { id: 'tango-tip', route: ['tango'], text: 'Tango : deux soleils côte à côte ? Les cases juste avant et juste après sont forcément des lunes. Clic droit pour poser directement une lune.' },
  { id: 'pp-tip', route: ['pinpoint'], text: 'Pinpoint : pas besoin de la formulation exacte, un mot-clé suffit (« fromages », « planètes »…). Une petite faute de frappe passe aussi.' },
  { id: 'sd-tip', route: ['sudoku'], text: 'Sudoku : active les Notes (touche N) pour écrire les chiffres possibles en petit. Elles s\'effacent toutes seules quand tu poses un chiffre.' },
  { id: 'ms-tip', route: ['demineur'], text: 'Démineur : clique sur un chiffre déjà entouré de ses drapeaux pour découvrir toutes ses voisines d\'un coup. Sur téléphone, appui long pour un drapeau.' },
  { id: 'sn-tip', route: ['snake'], text: 'Snake : Espace pour faire une pause. Sur téléphone, glisse sur le terrain ou utilise les flèches en dessous.' },
  { id: 'cr-ff', route: ['crash'], text: 'Une fois ta mise encaissée, la fusée accélère pour finir la manche plus vite : pas besoin d\'attendre pour rejouer.' },
  { id: 'sc-tip', route: ['scratch'], text: 'Jeux à gratter : 3 montants identiques et c\'est gagné. Gratte avec la souris ou le doigt, clique sur une case pour l\'ouvrir, ou « Tout gratter » pour aller vite.' },
  { id: 'sc-auto', route: ['scratch'], text: 'Le mode Auto achète et gratte les tickets à la chaîne. Les gains sont garantis dès l\'achat, l\'animation ne change rien au résultat.' },
  { id: 'mm-tip', route: ['memory'], text: 'Memory : termine avec peu d\'erreurs pour toucher le bonus de précision de +50 %.' },
  { id: 'cw-tip', route: ['crossword'], text: 'Mots croisés : clique deux fois sur une case (ou Espace) pour changer de sens. Un indice coûte 10 % de la récompense.' },
  { id: 'vault', route: ['lobby', 'crash', 'plinko', 'slots'], text: 'Le coffre-fort (icône en haut) met tes Brundles à l\'abri des mises. Ils comptent toujours dans ta fortune et le classement.' },
  { id: 'farm-full', route: ['farm'], text: 'Ferme : quand l\'entrepôt est plein, la récolte s\'arrête. Améliore l\'entrepôt avant de partir dormir !' },
  { id: 'farm-well', route: ['farm'], text: 'Un puits au milieu de plusieurs bananeraies les booste toutes en même temps : place-le bien !' },
  { id: 'cases', route: ['cases'], text: 'Le lot de la caisse est tiré dès le clic : l\'animation ne fait que le révéler. Regarde les chances de chaque lot dans « Contenu de la caisse ».' },
  { id: 'farm-nb', route: ['farm'], text: 'Onglet « Les voisins » : visite les fermes des autres singes et compare vos productions.' },
  { id: 'farm-lobby', route: ['lobby'], text: 'Ta ferme à bananes produit même quand tu n\'es pas là : pense à vendre tes bananes avant que l\'entrepôt soit plein.' },
  { id: 'calc-keys', route: ['quiz'], text: 'Tape ta réponse au clavier et valide avec Entrée, pas besoin de cliquer.' },
  { id: 'breaker', route: ['breaker'], text: `Chaque niveau terminé rapporte ${CONFIG.BREAKER_REWARD} ${CUR}, sans aucune mise. Les niveaux tournent en boucle, de plus en plus durs.` },
  { id: 'boards', route: ['ranking'], text: 'Chaque jeu de casino a aussi son propre classement, juste à côté du jeu : volume misé, meilleur multiplicateur et plus gros gain.' },
];
// Astuce déclenchée par un événement (solde presque vide), qui peut revenir
const BROKE = { id: 'broke', text: `Plus beaucoup de ${CUR} ? Les jeux gratuits sont là : quiz capitales, quiz ciné, calcul mental et casse-briques rapportent sans rien miser.`, go: ['Jeux gratuits', '#/lobby'] };

const FIRST_DELAY = 2500;      // après l'arrivée sur une page
const COOLDOWN = 3 * 60000;    // au moins 3 min entre deux astuces spontanées
const BROKE_COOLDOWN = 10 * 60000;
const K_SEEN = 'chibouk_tips_seen', K_OFF = 'chibouk_tips_off';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const route = () => (location.hash.replace(/^#\/?/, '') || 'lobby').split('?')[0];

export function createTips(wallet) {
  let seen = read(K_SEEN, {});
  let off = !!read(K_OFF, false);
  let lastShown = 0, lastBroke = 0, timer = null, el = null, current = null;

  const eligible = (t, r) => !seen[t.id] && (t.route.includes('*') || t.route.includes(r)) && (!t.when || safe(() => t.when(wallet)));
  const safe = (fn) => { try { return fn(); } catch { return false; } };
  // les astuces propres à la page passent avant les astuces générales
  const nextFor = (r) => TIPS.filter((t) => eligible(t, r)).sort((a, b) => (a.route.includes('*') ? 1 : 0) - (b.route.includes('*') ? 1 : 0))[0];

  function hide(markSeen = true) {
    if (current && markSeen && current.id !== 'broke') { seen[current.id] = Date.now(); write(K_SEEN, seen); }
    current = null;
    if (!el) return;
    const node = el; el = null;
    node.classList.remove('show');
    setTimeout(() => node.remove(), 300);
  }

  function show(tip) {
    if (!tip) return;
    hide(false);
    current = tip;
    lastShown = Date.now();
    const left = TIPS.filter((t) => !seen[t.id] && t !== tip).length;
    el = document.createElement('div');
    el.className = 'tip-pop';
    el.setAttribute('role', 'status');
    el.innerHTML = `${monkeySVG({ wink: true, cls: 'tip-monkey' })}
      <div class="tip-bubble"><button class="tip-x" aria-label="Fermer">×</button>
        <small>Le conseil du singe</small><p>${esc(tip.text)}</p>
        <div class="tip-btns">${tip.go ? `<a class="btn btn-gold btn-sm tip-go" href="${tip.go[1]}">${tip.go[0]}</a>` : ''}
          <button class="btn btn-ghost btn-sm tip-ok">Compris</button>${left ? '<button class="btn btn-ghost btn-sm tip-next">Astuce suivante</button>' : ''}</div>
        <button class="tip-off">Ne plus afficher les conseils</button></div>`;
    document.body.append(el);
    requestAnimationFrame(() => el && el.classList.add('show'));
    el.querySelector('.tip-x').onclick = () => hide();
    el.querySelector('.tip-ok').onclick = () => hide();
    const go = el.querySelector('.tip-go'); if (go) go.onclick = () => hide();
    const nx = el.querySelector('.tip-next');
    if (nx) nx.onclick = () => { hide(); const r = route(); show(nextFor(r) || TIPS.find((t) => !seen[t.id])); };
    el.querySelector('.tip-off').onclick = () => { setOff(true); hide(); };
  }

  // Après chaque changement de page : une astuce si on n'en a pas montré depuis un moment
  function schedule() {
    clearTimeout(timer);
    if (off) return;
    timer = setTimeout(function tryShow() {
      if (off || el) return;
      if (document.querySelector('.modal-backdrop')) { timer = setTimeout(tryShow, 3000); return; }
      if (Date.now() - lastShown < COOLDOWN) return;
      show(nextFor(route()));
    }, FIRST_DELAY);
  }

  function setOff(v) { off = v; write(K_OFF, v); if (v) { clearTimeout(timer); hide(false); } else schedule(); }

  const onHash = () => { if (el && current && current.id !== 'broke') hide(false); schedule(); };
  window.addEventListener('hashchange', onHash);
  const offWallet = wallet.on((e) => {
    if (off || !e || e.type !== 'bet') return;
    if (wallet.balance < 100 && Date.now() - lastBroke > BROKE_COOLDOWN && !document.querySelector('.modal-backdrop')) {
      lastBroke = Date.now();
      setTimeout(() => show(BROKE), 1500);
    }
  });
  schedule();

  return {
    get off() { return off; },
    setOff,
    // depuis le menu : une astuce tout de suite (même déjà vue si toutes l'ont été)
    showNow() {
      const r = route();
      const fresh = nextFor(r) || TIPS.find((t) => !seen[t.id] && (!t.when || safe(() => t.when(wallet))));
      const pool = TIPS.filter((t) => t.route.includes(r) || t.route.includes('*'));
      show(fresh || pool[Math.floor(Math.random() * pool.length)] || TIPS[0]);
    },
    reset() { seen = {}; write(K_SEEN, seen); },
    destroy() { clearTimeout(timer); window.removeEventListener('hashchange', onHash); offWallet(); hide(false); },
  };
}
