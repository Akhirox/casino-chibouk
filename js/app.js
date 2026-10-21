// Point d'entrée : authentification, coque du site, routeur, lobby, bonus quotidien
import { CONFIG } from './config.js';
import { createBackend } from './backend.js';
import { migrateFair } from './fairplay.js';
import { initActivity, bump, isIdle, onWake } from './activity.js';
import { Wallet, msUntilParisMidnight } from './wallet.js';
import { h, $, $$, fmt, money, esc, toast, modal, coinRain, countUp, CUR } from './ui.js';
import { monkeySVG, goldMonkeySVG, hangingMonkeySVG, coinSVG, symbolSVG, icon, plinkoArtSVG, crashArtSVG, towerArtSVG, minesArtSVG, diceArtSVG, quizArtSVG, capitalsArtSVG, moviesArtSVG, hiloArtSVG, kenoArtSVG, wheelArtSVG, limboArtSVG, flagsArtSVG, motusArtSVG, higherArtSVG } from './art.js';
import { sfx } from './sfx.js';
import * as Slots from './games/slots.js';
import * as Blackjack from './games/blackjack.js';
import * as Roulette from './games/roulette.js';
import * as Breaker from './games/breaker.js';
import * as Plinko from './games/plinko.js';
import * as Crash from './games/crash.js';
import * as Tower from './games/tower.js';
import * as Mines from './games/mines.js';
import * as Dice from './games/dice.js';
import * as Quiz from './games/quiz.js';
import * as Capitals from './games/capitals.js';
import * as Movies from './games/movies.js';
import * as Hilo from './games/hilo.js';
import * as Keno from './games/keno.js';
import * as WheelGame from './games/wheel.js';
import * as Limbo from './games/limbo.js';
import * as Flags from './games/flags.js';
import * as Motus from './games/motus.js';
import * as Higher from './games/higher.js';
import * as Queens from './games/queens.js';
import * as Tango from './games/tango.js';
import * as Pinpoint from './games/pinpoint.js';
import * as Sudoku from './games/sudoku.js';
import * as Snake from './games/snake.js';
import * as Geo from './games/geo.js';
import * as Culture from './games/culture.js';
import * as Typing from './games/typing.js';
import * as Demineur from './games/demineur.js';
import * as Farm from './farm.js';
import * as Scratch from './games/scratch.js';
import * as Jungle from './games/jungle.js';
import * as Craps from './games/craps.js';
import * as Poker from './poker.js';
import { initJP, onJP, jpState } from './jp.js';
import * as Memory from './games/memory.js';
import * as Crossword from './games/crossword.js';
import { scratchArtSVG, memoryArtSVG, crosswordArtSVG, jungleArtSVG, geoArtSVG, typingArtSVG, crapsArtSVG, cultureArtSVG } from './art.js';
import * as FarmCore from './farm-core.js';
import { queensArtSVG, tangoArtSVG, pinpointArtSVG, sudokuArtSVG, snakeArtSVG, demineurArtSVG } from './art.js';
import * as Shop from './shop.js';
import * as Cases from './cases.js';
import { initLoot } from './loot.js';
import { createChat } from './chat.js';
import { initQuests, today, questText, vipOf, vipProgress, VIP, rakePot, claimRake, initVip, pctFmt, freeMult, xMult, questMult, questReward } from './progress.js';
import { initChallenges, challengeRoute, challengeMult, MIN_BET, PODIUM } from './challenges.js';
import { createSocial, feedRich, feedText, groupFeed, groupRich, FEED_ICON, jackpotChance, chanceText } from './social.js';
import { openVipModal } from './vip.js';
import { openVault } from './vault.js';
import { syncWeeks } from './weekly.js';
import { initHistory } from './history.js';
import { openDailyWheel, bonusSpins } from './dailywheel.js';
import { mountBoard } from './gameboard.js';
import { initAchievements, achSummary, TIERS } from './achievements.js';
import * as AchPage from './achpage.js';
import * as News from './changelog.js';
import { initUpdater } from './updater.js';
import { initGameLog } from './gamelog.js';
import * as Admin from './admin.js';
import * as Stats from './stats.js';
import * as Ranking from './ranking.js';
import { createTracker } from './tracker.js';
import { getPlayers } from './players.js';
import * as Profile from './profile.js';
import { createTips } from './tips.js';
import { setRewardWallet, bonusHTML, questInfo, challengeInfo } from './rewards.js';
import { tagsHTML } from './tags.js';
import { receiveGifts } from './gifts.js';
import { mountGoals } from './goals.js';
import { onRecords, recordsOf, RECORD_CATS, trackCounters } from './records.js';

const app = $('#app');
let backend = null;
let wallet = null;
let cleanupView = null;
let signupPromise = null;
let authToken = 0;
let headerTimer = null;
let tracker = null;
let achievements = null;
let inboxTimer = null;
let tips = null;
let offCounters = null, offJP = null, offJPPill = null; // suivi des records « compteurs » (séries, Pinpoint, casse-briques)
let updater = null;
let quests = null;
let vip = null;
let farmTimer = null;
let social = null;
let challenges = null;
let loot = null;
let chat = null;
let historyOff = null;
let logOff = null;
let adminP = null; // promesse : ce compte est-il admin ?
let weeksTimer = null;

const ROUTES = {
  lobby: { label: 'Accueil', icon: 'home', mount: mountLobby },
  slots: { label: 'Chibouk Slot', icon: 'slots', mount: Slots.mount, group: 'casino' },
  jungle: { label: 'Jungle Connect', icon: 'jungle', mount: Jungle.mount, group: 'casino' },
  craps: { label: 'Craps', icon: 'craps', mount: Craps.mount, group: 'casino' },
  blackjack: { label: 'Blackjack', icon: 'blackjack', mount: Blackjack.mount, group: 'casino' },
  roulette: { label: 'Roulette', icon: 'roulette', mount: Roulette.mount, group: 'casino' },
  plinko: { label: 'Plinkoko', icon: 'plinko', mount: Plinko.mount, group: 'casino' },
  crash: { label: 'Crashibouk', icon: 'crash', mount: Crash.mount, group: 'casino' },
  tower: { label: 'Tower', icon: 'tower', mount: Tower.mount, group: 'casino' },
  mines: { label: 'Mines', icon: 'mines', mount: Mines.mount, group: 'casino' },
  dice: { label: 'Dice', icon: 'dice', mount: Dice.mount, group: 'casino' },
  hilo: { label: 'Hi-Lo', icon: 'hilo', mount: Hilo.mount, group: 'casino' },
  keno: { label: 'Keno', icon: 'keno', mount: Keno.mount, group: 'casino' },
  wheel: { label: 'Roue du Singe', icon: 'wheel', mount: WheelGame.mount, group: 'casino' },
  limbo: { label: 'Limbo', icon: 'limbo', mount: Limbo.mount, group: 'casino' },
  scratch: { label: 'Jeux à gratter', icon: 'scratch', mount: Scratch.mount, group: 'casino' },
  quiz: { label: 'Calcul mental', icon: 'quiz', mount: Quiz.mount, group: 'free', sub: 'quiz' },
  capitals: { label: 'Capitales', icon: 'globe', mount: Capitals.mount, group: 'free', sub: 'quiz' },
  flags: { label: 'Drapeaux', icon: 'flag', mount: Flags.mount, group: 'free', sub: 'quiz' },
  movies: { label: 'Quiz ciné', icon: 'film', mount: Movies.mount, group: 'free', sub: 'quiz' },
  higher: { label: 'Plus ou moins', icon: 'higher', mount: Higher.mount, group: 'free', sub: 'quiz' },
  geo: { label: 'Géographie', icon: 'globe', mount: Geo.mount, group: 'free', sub: 'quiz' },
  culture: { label: 'Culture G', icon: 'bulb', mount: Culture.mount, group: 'free', sub: 'quiz' },
  typing: { label: 'Frappe éclair', icon: 'keyboard', mount: Typing.mount, group: 'free', sub: 'arcade' },
  motus: { label: 'Mot du jour', icon: 'motus', mount: Motus.mount, group: 'free', sub: 'puzzle' },
  queens: { label: 'Queens', icon: 'queens', mount: Queens.mount, group: 'free', sub: 'puzzle' },
  tango: { label: 'Tango', icon: 'tango', mount: Tango.mount, group: 'free', sub: 'puzzle' },
  pinpoint: { label: 'Pinpoint', icon: 'pinpoint', mount: Pinpoint.mount, group: 'free', sub: 'quiz' },
  sudoku: { label: 'Sudoku', icon: 'sudoku', mount: Sudoku.mount, group: 'free', sub: 'puzzle' },
  demineur: { label: 'Démineur', icon: 'demineur', mount: Demineur.mount, group: 'free', sub: 'puzzle' },
  snake: { label: 'Snake', icon: 'snake', mount: Snake.mount, group: 'free', sub: 'arcade' },
  memory: { label: 'Memory', icon: 'memory', mount: Memory.mount, group: 'free', sub: 'puzzle' },
  crossword: { label: 'Mots croisés', icon: 'crossword', mount: Crossword.mount, group: 'free', sub: 'puzzle' },
  breaker: { label: 'Casse-briques', icon: 'breaker', mount: Breaker.mount, group: 'free', sub: 'arcade' },
  farm: { label: 'Ferme', icon: 'banana', mount: Farm.mount },
  poker: { label: 'Poker', icon: 'poker', mount: Poker.mount },
  cases: { label: 'Caisses', icon: 'crate', mount: Cases.mount },
  shop: { label: 'Boutique', icon: 'shop', mount: Shop.mount },
  achievements: { label: 'Succès', icon: 'medal', mount: AchPage.mount },
  ranking: { label: 'Classements', icon: 'trophy', mount: Ranking.mount },
  stats: { label: 'Stats', icon: 'stats', mount: Stats.mount },
  news: { label: 'Nouveautés', icon: 'scroll', mount: News.mount, nav: false },
  profile: { label: 'Mon profil', icon: 'user', mount: Profile.mount, nav: false },
  admin: { label: 'Journal', icon: 'scroll', mount: Admin.mount, nav: false },
};
const GROUPS = { casino: { label: 'Casino', icon: 'chip' }, free: { label: 'Mini-jeux', icon: 'gift' } };
const SUBS = { puzzle: 'Puzzle', quiz: 'Quiz', arcade: 'Adresse' };

// Jeux qui affichent leur classement à côté (clé de stats -> nom affiché)
const BOARD_GAMES = { slots: 'Chibouk Slot', jungle: 'Jungle Connect', craps: 'Craps', blackjack: 'Blackjack', roulette: 'Roulette', plinko: 'Plinkoko', crash: 'Crashibouk', tower: 'Tower', mines: 'Mines', dice: 'Dice', hilo: 'Hi-Lo', keno: 'Keno', wheel: 'Roue du Singe', limbo: 'Limbo', scratch: 'Jeux à gratter' };

// Menu : Accueil | Casino ▾ · Mini-jeux ▾ · Ferme | Boutique · Succès · Classements · Stats
function navHTML() {
  const link = (k, r, cls = '') => `<a href="#/${k}" data-r="${k}" title="${r.label}" class="${cls}"><span class="ni">${icon(r.icon)}</span><span class="nl">${r.label}</span></a>`;
  const group = (g) => {
    const items = Object.entries(ROUTES).filter(([, r]) => r.group === g);
    const btn = `<button type="button" class="nav-gbtn ${g === 'free' ? 'nav-free' : 'nav-casino'}" aria-haspopup="true"><span class="ni">${icon(GROUPS[g].icon)}</span><span class="nl">${GROUPS[g].label} <i class="chev">${icon('chev')}</i></span></button>`;
    const body = g === 'free'
      ? Object.entries(SUBS).map(([sk, sl]) => `<div class="nav-pop-title">${sl}</div><div class="nav-pop-grid">${items.filter(([, r]) => r.sub === sk).map(([k, r]) => link(k, r, 'nav-free')).join('')}</div>`).join('')
      : `<div class="nav-pop-title">Jeux de casino</div><div class="nav-pop-grid">${items.map(([k, r]) => link(k, r)).join('')}</div>`;
    return `<div class="nav-group" data-g="${g}">${btn}<div class="nav-pop ${g}">${body}</div></div>`;
  };
  const sep = '<span class="nav-sep" aria-hidden="true"></span>';
  return link('lobby', ROUTES.lobby) + sep + group('casino') + group('free') + link('poker', ROUTES.poker, 'nav-poker') + link('farm', ROUTES.farm, 'nav-farm') + link('cases', ROUTES.cases, 'nav-cases') + sep + ['shop', 'achievements', 'ranking', 'stats'].map((k) => link(k, ROUTES[k])).join('');
}

/* ============================== DÉMARRAGE ============================== */
async function boot() {
  try {
    backend = await createBackend();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="fatal">${monkeySVG({ wink: true })}<h2>Impossible de charger Firebase</h2><p>${esc(e.message)}</p><p>Vérifie ta connexion et le fichier <code>js/firebase-config.js</code>.</p></div>`;
    return;
  }
  document.body.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  setupTabGuard();
  initActivity();
  // clic sur un rang VIP => tableau des rangs
  document.addEventListener('click', (e) => { if (wallet && e.target.closest('[data-vip]') && !e.target.closest('.modal')) { e.preventDefault(); openVipModal(wallet); } });
  // clic sur un pseudo (classements) => fiche du joueur
  Profile.initPlayerCards({ get backend() { return backend; }, get wallet() { return wallet; } });
  backend.onAuth(async (user) => {
    const token = ++authToken;
    if (tracker) { tracker.destroy(); tracker = null; }
    if (achievements) { achievements.destroy(); achievements = null; }
    if (tips) { tips.destroy(); tips = null; }
    if (quests) { quests.destroy(); quests = null; }
    if (vip) { vip.destroy(); vip = null; }
    if (farmTimer) { farmTimer.destroy(); farmTimer = null; }
    if (challenges) { challenges.destroy(); challenges = null; }
    if (loot) { loot.destroy(); loot = null; }
    if (dockOff) { dockOff(); dockOff = null; }
    if (chat) { chat.destroy(); chat = null; }
    if (social) { social.destroy(); social = null; }
    if (historyOff) { historyOff(); historyOff = null; }
    if (logOff) { logOff(); logOff = null; }
    adminP = null;
    clearInterval(weeksTimer);
    [...document.body.classList].forEach((c) => /^(cb|th)-/.test(c) && document.body.classList.remove(c));
    clearInterval(inboxTimer);
    if (wallet) { await wallet.stop(); wallet = null; }
    if (!user) { renderAuth(); return; }
    let hint = user.pseudo;
    if (signupPromise) { try { hint = (await signupPromise).pseudo; } catch { /* inscription échouée */ } }
    if (token !== authToken) return;
    app.innerHTML = `<div class="boot">${monkeySVG({ cls: 'bounce' })}<p>Ouverture du coffre…</p></div>`;
    try {
      const w = await Wallet.open(backend, { ...user, pseudo: hint });
      if (token !== authToken) { w.stop(); return; }
      if (w.p.banned) { w.disabled = true; w.stop(); renderBanned(w.p); return; }
      wallet = w;
      if (migrateFair(w)) w.touch({ type: 'fairfix' }); // blocages des jeux à réponse écrite levés (V23)
      // sauvegarde refusée par Firebase : compte suspendu ou corrigé par un admin → on recharge le profil
      w.onRejected = async () => {
        if (w.rejecting) return; w.rejecting = true;
        try {
          const fresh = await backend.loadProfile(w.uid, w.pseudo);
          if (fresh.banned || (fresh.adminRev || 0) !== (w.p.adminRev || 0)) {
            w.disabled = true;
            try { localStorage.removeItem(w.backupKey); } catch {}
            await modal({ title: fresh.banned ? 'Compte suspendu' : 'Compte mis à jour par un admin', html: `<p>${fresh.banned ? 'Ton compte a été suspendu par un admin du casino.' : 'Un admin a mis à jour ton compte (correction, tag ou cadeau). La page va se recharger.'}</p>`, buttons: [{ label: 'OK', value: true, primary: true }], dismissable: false });
            location.reload();
          }
        } catch (e) { console.warn(e); } finally { w.rejecting = false; }
      };
      if (w.tampered) backend.addLog({ uid: w.uid, pseudo: w.pseudo, game: '_save', flag: 'cheat', amount: 0, at: Date.now(), v: News.VERSION,
        reason: `sauvegarde locale modifiée à la main, ignorée (solde dedans : ${w.tampered.balance ?? '?'}, solde réel : ${w.tampered.base ?? '?'})` }).catch(() => {});
      renderShell();
      route();
      // nouvelle version publiée pendant qu'on joue : bandeau, puis rechargement au prochain changement de page
      if (!updater) updater = initUpdater({ current: News.VERSION, beforeReload: async () => {
        if (cleanupView) { try { cleanupView(); } catch (e) { console.error(e); } cleanupView = null; } // parties en cours encaissées
        if (wallet) await wallet.flush();
      } });
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="fatal">${monkeySVG({})}<h2>Erreur de chargement du profil</h2><p>${esc(e.message)}</p><p>As-tu bien publié les règles Firestore ? (voir README)</p><button class="btn btn-gold" id="retry">Réessayer</button> <button class="btn btn-ghost" id="out">Se déconnecter</button></div>`;
      $('#retry').onclick = () => location.reload();
      $('#out').onclick = () => backend.signOut();
    }
  });
}

/* ============================ ANTI MULTI-ONGLET ============================ */
function setupTabGuard() {
  if (!('BroadcastChannel' in window)) return;
  const id = Math.random().toString(36).slice(2);
  const ch = new BroadcastChannel('chibouk-tabs');
  ch.onmessage = async (e) => {
    if (e.data && e.data.type === 'hello' && e.data.id !== id && wallet) {
      await wallet.flush();
      wallet.disabled = true;
      $$('.modal-backdrop').forEach((m) => m.remove());
      const ov = h(`<div class="tab-guard">${monkeySVG({ wink: true })}<h2>Le casino est ouvert dans un autre onglet</h2>
        <p>Pour éviter que tes soldes se marchent dessus, un seul onglet peut jouer à la fois.</p>
        <button class="btn btn-gold">Jouer dans cet onglet</button></div>`);
      ov.querySelector('button').onclick = () => location.reload();
      document.body.append(ov);
    }
  };
  ch.postMessage({ type: 'hello', id });
}

/* ================================ AUTH ================================ */
function renderAuth() {
  if (cleanupView) { cleanupView(); cleanupView = null; }
  clearInterval(headerTimer);
  let mode = 'login';
  app.innerHTML = '';
  const v = h(`<div class="auth-wrap">
    ${backend.mode === 'demo' ? `<div class="demo-banner">Mode démo local : Firebase n'est pas encore configuré, les comptes sont enregistrés dans ce navigateur uniquement.</div>` : ''}
    <div class="auth-card">
      <div class="auth-logo">${goldMonkeySVG('auth-monkey')}</div>
      <h1 class="logo-text">Casino <span>Chibouk</span></h1>
      <p class="auth-sub">Le casino le plus singe de la jungle. Une roue de bonus gratuite chaque jour.</p>
      <div class="tabs"><button class="tab active" data-m="login">Connexion</button><button class="tab" data-m="signup">Créer un compte</button></div>
      <form class="auth-form" autocomplete="on">
        <label>Pseudo<input name="pseudo" required minlength="3" maxlength="16" autocomplete="username" placeholder="ex : KingKong_42"></label>
        <label>Mot de passe<input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="6 caractères minimum"></label>
        <label class="only-signup">Confirmer le mot de passe<input name="confirm" type="password" minlength="6" autocomplete="new-password"></label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-gold btn-lg" type="submit">Entrer dans la jungle</button>
      </form>
      <p class="fineprint">Argent 100 % fictif, juste pour s'amuser entre potes.</p>
    </div></div>`);
  app.append(v);
  const form = $('form', v), err = $('.form-error', v), submit = $('button[type=submit]', v);
  const setMode = (m) => {
    mode = m;
    $$('.tab', v).forEach((t) => t.classList.toggle('active', t.dataset.m === m));
    v.classList.toggle('signup', m === 'signup');
    form.confirm.required = m === 'signup';
    form.password.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    submit.textContent = m === 'signup' ? `Créer mon compte (+${fmt(CONFIG.START_BALANCE)} ${CUR})` : 'Entrer dans la jungle';
    err.textContent = '';
  };
  $$('.tab', v).forEach((t) => (t.onclick = () => setMode(t.dataset.m)));
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const pseudo = form.pseudo.value.trim(), pw = form.password.value;
    if (mode === 'signup' && pw !== form.confirm.value) { err.textContent = 'Les mots de passe ne correspondent pas'; return; }
    submit.disabled = true;
    try {
      if (mode === 'signup') { signupPromise = backend.signUp(pseudo, pw); await signupPromise; }
      else await backend.signIn(pseudo, pw);
    } catch (ex) {
      err.textContent = ex.message;
      submit.disabled = false;
    } finally { signupPromise = null; }
  };
}

function renderBanned(p) {
  app.innerHTML = `<div class="fatal">${monkeySVG({})}<h2>Compte suspendu</h2><p>Le compte <b>${esc(p.pseudo)}</b> a été suspendu par un admin du casino.</p>${p.banReason ? `<p class="muted">Raison : ${esc(p.banReason)}</p>` : ''}<button class="btn btn-ghost" id="out">Se déconnecter</button></div>`;
  $('#out').onclick = () => backend.signOut();
}

/* ================================ COQUE ================================ */
const volSliderHTML = () => `<input type="range" class="vol-range" min="0" max="100" step="1" aria-label="Volume du son">`;
function renderShell() {
  app.innerHTML = '';
  const shell = h(`<div class="shell">
    ${backend.mode === 'demo' ? `<div class="demo-banner slim">Mode démo local (Firebase non configuré)</div>` : ''}
    <header class="topbar">
      <a class="brand" href="#/lobby">${monkeySVG({ cls: 'brand-monkey' })}<span class="logo-text">Casino <span>Chibouk</span></span></a>
      <nav class="nav">${navHTML()}</nav>
      <div class="top-right">
        <button class="daily-btn" title="Bonus quotidien"></button>
        <div class="balance-pill" title="Ton solde">${coinSVG('coin')}<span class="bal-amount">${fmt(wallet.balance)}</span></div>
        <a class="pkj-pill" href="#/poker" title="Tes Jetons Poker (JP)">${icon('jp')}<span class="pkj-amount">${fmt(jpState().jp)}</span><small>JP</small></a>
        <span class="sync-dot saved" title="Sauvegardé"></span>
        <button class="icon-btn vault-btn" title="Coffre-fort">${icon('vault')}</button>
        <button class="icon-btn send-btn" title="Envoyer des ${CUR}">${icon('send')}</button>
        <button class="icon-btn tracker-btn" title="Suivi de balance">${icon('chart')}</button>
        <div class="vol-wrap"><button class="icon-btn mute-btn" title="Son et volume" aria-haspopup="true">${icon(sfx.muted ? 'mute' : 'sound')}</button>
          <div class="vol-pop" role="dialog" aria-label="Volume"><div class="vol-head"><span>Volume</span><b class="vol-pct"></b></div>${volSliderHTML()}<button type="button" class="btn btn-ghost btn-sm wide vol-mute"></button></div></div>
        <div class="user-menu"><button class="user-btn"><span class="ub-av">${Profile.avatarHTML(wallet.p, 'av-xs')}</span><span class="ub-name">${esc(wallet.pseudo)}</span> ▾</button>
          <div class="user-drop"><a href="#/profile">Mon profil</a><a href="#/shop">Boutique</a><a href="#/cases">Caisses</a><a href="#/stats">Mes stats</a><a href="#/ranking">Classements</a><a href="#/achievements">Mes succès</a><a href="#/news">Nouveautés</a><a href="#/admin" class="admin-menu" hidden>Espace admin</a><div class="ud-vol"><span>${icon('sound')}</span>${volSliderHTML()}</div><button class="vault-menu">Coffre-fort</button><button class="send-menu">Envoyer des ${CUR}</button><button class="tip-menu">Un conseil du singe</button><button class="tip-toggle"></button><button class="logout">Se déconnecter</button></div></div>
      </div>
    </header>
    <main id="view"></main>
    <aside class="dock" id="dock" aria-label="En direct de la jungle et chat"><button type="button" class="dock-toggle">${icon('chev')}<span>Direct</span></button><div class="dock-in fp"></div></aside>
    <footer class="foot">Casino Chibouk <a href="#/news">V${News.VERSION} · Nouveautés</a> · argent fictif, aucune mise réelle · sauvegarde automatique toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s</footer>
  </div>`);
  app.append(shell);

  const balEl = $('.bal-amount', shell), pill = $('.balance-pill', shell);
  let shown = wallet.balance;
  wallet.on((evt) => {
    if (evt && evt.type === 'profile') $('.ub-av', shell).innerHTML = Profile.avatarHTML(wallet.p, 'av-xs');
    if (evt && evt.type === 'vipfree') toast(`Bonus VIP ${xMult(evt.mult)} : <b>+${fmt(evt.amount)} ${CUR}</b> en plus`, 'win', 3500);
    const nb = wallet.shownBalance;
    if (nb !== shown) {
      pill.classList.remove('up', 'down'); void pill.offsetWidth;
      pill.classList.add(nb > shown ? 'up' : 'down');
      shown = nb;
    }
    balEl.textContent = fmt(nb);
    const vb = $('.vault-btn', shell); if (vb) { vb.title = `Coffre-fort : ${fmt(wallet.vault)} ${CUR}`; vb.classList.toggle('has', wallet.vault > 0); }
    updateDaily();
  });
  const dot = $('.sync-dot', shell);
  const syncTitles = { saved: 'Sauvegardé', pending: 'Modifications en attente (envoi auto)', saving: 'Sauvegarde…', error: 'Échec de sauvegarde, nouvel essai bientôt' };
  wallet.onSync((s) => { dot.className = 'sync-dot ' + s; dot.title = syncTitles[s] || s; });

  tracker = createTracker(wallet, $('.tracker-btn', shell));
  achievements = initAchievements(wallet, (a) => {
    toast(`<span class="ach-toast t-${a.tier}">${icon('medal')}<span><small>Succès débloqué · ${TIERS[a.tier].name}</small><b>${esc(a.name)}</b><em>+${fmt(TIERS[a.tier].reward)} ${CUR}</em></span></span>`, 'ach', 5000);
    sfx.bonus();
    if (a.tier === 'gold' || a.tier === 'legend') coinRain(40);
  });
  setTimeout(() => { if (wallet) News.maybeShowNews(); }, 1200);
  Shop.applyCosmetics(wallet);
  historyOff = initHistory(wallet);
  logOff = initGameLog(wallet, backend);
  // une partie jouée (même en spins automatiques) compte comme de l'activité : le fil et les transferts restent à jour
  const offAct = wallet.on(() => bump());
  const prevLog = logOff; logOff = () => { offAct(); prevLog(); };
  adminP = cachedIsAdmin(wallet.uid);
  adminP.then((ok) => { const a = $('.admin-menu', shell); if (a) a.hidden = !ok; });
  today(wallet);
  quests = initQuests(wallet, (q, bonus) => {
    if (bonus) { toast(`<span class="ach-toast">${icon('check')}<span><small>Quêtes du jour</small><b>Les 3 quêtes sont terminées !</b><em>+${fmt(Math.round(CONFIG.QUEST_BONUS * questMult(wallet)))} ${CUR} de bonus</em></span></span>`, 'ach', 5000); coinRain(30); }
    else toast(`<span class="ach-toast">${icon('check')}<span><small>Quête terminée</small><b>${esc(questText(q))}</b><em>+${fmt(Math.round(questReward(q) * questMult(wallet)))} ${CUR}</em></span></span>`, 'ach', 4500);
    sfx.bonus();
  });
  social = createSocial(wallet, backend);
  loot = initLoot(wallet);
  setRewardWallet(wallet);
  setTimeout(() => wallet && receiveGifts(wallet, backend), 1500); // cadeaux de l'admin (indemnisations…)
  chat = createChat(wallet, social);
  challenges = initChallenges(wallet, backend, social, {
    onWin: (c, prize, place) => { toast(`<span class="ach-toast">${icon('flag')}<span><small>Défi de la jungle : ${place === 1 ? '1re place !' : `${place}e place`}</small><b>${esc(c.text)}</b><em>+${fmt(prize)} ${CUR}</em></span></span>`, 'ach', 6000); sfx.bonus(); sfx.win(place === 1); coinRain(place === 1 ? 50 : place === 2 ? 30 : 20); },
    onLost: () => toast('Défi réussi, mais le podium est déjà complet !', 'info', 5000),
    onNew: (v) => { if (!isIdle() && location.hash !== '#/lobby' && location.hash !== '') toast(`<span class="ach-toast">${icon('flag')}<span><small>Nouveau défi de la jungle</small><b>${esc(v.c.text)}</b><em>+${fmt(v.prize)} ${CUR} pour le premier, 3 places au podium</em></span></span>`, 'ach', 6000); },
  });
  farmTimer = Farm.initFarm(wallet);
  vip = initVip(wallet, (v, bonus) => {
    if (bonus > 0) { toast(`<span class="ach-toast">${icon('star')}<span><small>Nouveau rang VIP</small><b>${esc(v.name)}</b><em>+${fmt(bonus)} ${CUR} de bonus</em></span></span>`, 'ach', 6000); sfx.bonus(); coinRain(40); }
  });
  syncWeeks(backend, wallet);
  weeksTimer = setInterval(() => { if (wallet && !isIdle()) { syncWeeks(backend, wallet); getPlayers(backend, wallet).catch(() => {}); } }, 15 * 60000); // sans lecture tant que la semaine n'a pas changé
  // records (tags et bonus de +5 %) : liste des joueurs relue au démarrage (cache de 10 min), puis toutes les 15 min
  setTimeout(() => wallet && getPlayers(backend, wallet).catch(() => {}), 6000);
  let myRecs = null;
  offCounters && offCounters(); offCounters = trackCounters(wallet); // séries et compteurs : date à laquelle le record est atteint
  // Jetons Poker : solde en direct dans l'en-tête, gains des mini-jeux
  offJP && offJP(); offJP = initJP(backend, wallet);
  offJPPill && offJPPill(); offJPPill = onJP((j) => { const el = $(".pkj-amount", shell); if (el) el.textContent = fmt(j.jp); });
  onRecords(() => {
    if (!wallet) return;
    const now = recordsOf(wallet.uid).map((c) => c.k);
    if (myRecs) {
      const won = now.filter((k) => !myRecs.includes(k)), lost = myRecs.filter((k) => !now.includes(k));
      const nameOf = (k) => (RECORD_CATS.find((c) => c.k === k) || {}).name || k;
      if (won.length) { toast(`<span class="ach-toast">${icon('trophy')}<span><small>Nouveau record !</small><b>${won.map((k) => esc(nameOf(k))).join(', ')}</b><em>+5 % sur tes gains de mini-jeux et de défis</em></span></span>`, 'ach', 6000); sfx.bonus(); }
      if (lost.length) toast(`Record perdu : <b>${lost.map((k) => esc(nameOf(k))).join(', ')}</b>. Va le reprendre !`, 'info', 6000);
    }
    myRecs = now;
  });
  tips = createTips(wallet);
  const tipToggle = $('.tip-toggle', shell);
  const tipLabel = () => { tipToggle.textContent = `Conseils automatiques : ${tips.off ? 'non' : 'oui'}`; };
  tipLabel();
  tipToggle.onclick = (e) => { e.stopPropagation(); tips.setOff(!tips.off); tipLabel(); toast(tips.off ? 'Le singe se tait. Tu peux toujours lui demander un conseil depuis ce menu.' : 'Le singe reprend du service !'); };
  $('.tip-menu', shell).onclick = () => tips.showNow();
  $('.send-btn', shell).onclick = openTransfer;
  $('.vault-btn', shell).onclick = () => openVault(wallet);
  $('.vault-menu', shell).onclick = () => openVault(wallet);
  $('.send-menu', shell).onclick = openTransfer;
  startInbox();
  mountDock();
  // son : bouton haut-parleur → petite fenêtre avec le curseur de volume (aussi dans le menu du pseudo)
  const volWrap = $('.vol-wrap', shell);
  const syncVol = () => {
    const pct = Math.round(sfx.volume * 100), off = sfx.muted;
    $$('.vol-range', shell).forEach((r) => { if (document.activeElement !== r) r.value = off ? 0 : pct; r.style.setProperty('--p', (off ? 0 : pct) + '%'); });
    $('.vol-pct', shell).textContent = off ? 'coupé' : pct + ' %';
    $('.mute-btn', shell).innerHTML = icon(off ? 'mute' : 'sound');
    $('.vol-mute', shell).textContent = off ? 'Réactiver le son' : 'Couper le son';
  };
  $('.mute-btn', shell).onclick = (e) => { e.stopPropagation(); volWrap.classList.toggle('open'); };
  volWrap.addEventListener('click', (e) => e.stopPropagation());
  $('.vol-mute', shell).onclick = () => { sfx.toggle(); syncVol(); if (!sfx.muted) sfx.click(); };
  let volTick = 0;
  $$('.vol-range', shell).forEach((r) => {
    r.addEventListener('click', (e) => e.stopPropagation());
    r.addEventListener('input', () => { sfx.setVolume(+r.value / 100); syncVol(); const t = Date.now(); if (t - volTick > 120) { volTick = t; sfx.click(); } });
  });
  $('.ud-vol', shell).addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => volWrap.classList.remove('open'));
  syncVol();
  const um = $('.user-menu', shell);
  $('.user-btn', shell).onclick = (e) => { e.stopPropagation(); um.classList.toggle('open'); tipToggle.textContent = `Conseils automatiques : ${tips.off ? 'non' : 'oui'}`; };
  document.addEventListener('click', () => um.classList.remove('open'));
  // menus déroulants Casino / Gratuit
  $$('.nav-group', shell).forEach((g) => {
    $('.nav-gbtn', g).onclick = (e) => { e.stopPropagation(); const open = !g.classList.contains('open'); $$('.nav-group', shell).forEach((x) => x.classList.remove('open')); g.classList.toggle('open', open); };
    $('.nav-pop', g).onclick = (e) => { if (e.target.closest('a')) g.classList.remove('open'); else e.stopPropagation(); };
  });
  document.addEventListener('click', () => $$('.nav-group.open').forEach((x) => x.classList.remove('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.nav-group.open').forEach((x) => x.classList.remove('open')); });
  $('.logout', shell).onclick = async () => { await wallet.flush(); await backend.signOut(); location.hash = '#/lobby'; };

  const daily = $('.daily-btn', shell);
  daily.onclick = claimDaily;
  function updateDaily() {
    if (wallet.dailyAvailable()) { daily.classList.add('ready'); daily.innerHTML = `${icon('wheel')}<span>Roue du jour</span>`; }
    else if (bonusSpins(wallet)) { daily.classList.add('ready'); daily.innerHTML = `${icon('wheel')}<span>Tour bonus ×${bonusSpins(wallet)}</span>`; }
    else { daily.classList.remove('ready'); daily.innerHTML = `${icon('hourglass')}<span>${countdown()}</span>`; }
    const lobbyDaily = $('#lobby-daily');
    if (lobbyDaily) renderLobbyDaily(lobbyDaily);
  }
  clearInterval(headerTimer);
  headerTimer = setInterval(updateDaily, 1000);
  updateDaily();

  window.onhashchange = route;
}

function countdown() {
  const s = Math.floor(msUntilParisMidnight() / 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/* ============================ TRANSFERTS ============================ */
// Statut admin gardé 1 jour dans le navigateur (1 lecture de moins à chaque ouverture ; les règles Firestore restent juges)
function cachedIsAdmin(uid) {
  if (!backend.isAdmin) return Promise.resolve(false);
  const k = 'chibouk_admin_' + uid;
  try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && Date.now() - c.at < 86400000) return Promise.resolve(!!c.ok); } catch {}
  return backend.isAdmin(uid).then((ok) => { try { localStorage.setItem(k, JSON.stringify({ ok, at: Date.now() })); } catch {} return ok; });
}

let inboxLast = 0, inboxWakeOff = null;
function startInbox() {
  // Brundles reçus : relus toutes les 3 min, seulement si le joueur est là (et tout de suite à son retour)
  const check = async (force = false) => {
    if (!wallet || (!force && isIdle())) return;
    if (!force && Date.now() - inboxLast < 30000) return;
    inboxLast = Date.now();
    const got = await wallet.checkInbox();
    for (const t of got) {
      toast(`${esc(t.fromPseudo)} t'a envoyé <b>${fmt(t.amount)} ${CUR}</b> !`, 'win', 5000);
    }
    if (got.length) { sfx.coin(); coinRain(Math.min(40, 10 + got.length * 8)); }
  };
  clearInterval(inboxTimer);
  inboxTimer = setInterval(() => check(), CONFIG.INBOX_INTERVAL_MS);
  if (inboxWakeOff) inboxWakeOff();
  inboxWakeOff = onWake(() => check());
  setTimeout(() => check(true), 1500);
}

async function openTransfer() {
  const w = wallet;
  if (!w) return;
  const hist = w.transferHistory().slice(0, 8);
  const m = h(`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">
    <h2 class="modal-title">Envoyer des ${CUR}</h2>
    <div class="modal-body tr-form">
      <p class="muted">Ton solde : ${money(w.balance)}</p>
      <label>Destinataire<input id="tr-to" list="tr-players" autocomplete="off" placeholder="Pseudo du joueur"><datalist id="tr-players"></datalist></label>
      <label>Montant<input id="tr-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="ex : 500"></label>
      <div class="auto-row">${[100, 500, 1000, 5000].map((v) => `<button type="button" class="btn btn-ghost btn-sm" data-q="${v}">${fmt(v)}</button>`).join('')}<button type="button" class="btn btn-ghost btn-sm" data-q="half">½</button><button type="button" class="btn btn-ghost btn-sm max-btn" data-q="max">MAX</button></div>
      <p class="form-error" id="tr-err"></p>
      ${hist.length ? `<h3>Derniers transferts</h3><ul class="tr-hist">${hist.map((x) => `<li class="${x.dir}"><span>${x.dir === 'in' ? 'Reçu de' : 'Envoyé à'} <b>${esc(x.pseudo)}</b></span><b>${x.dir === 'in' ? '+' : '−'}${fmt(x.amount)}</b></li>`).join('')}</ul>` : ''}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Annuler</button><button class="btn btn-gold" id="tr-send">${icon('send')}Envoyer</button></div>
  </div></div>`);
  document.body.append(m);
  requestAnimationFrame(() => m.classList.add('show'));
  const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 250); };
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-x]')) close(); });
  const toIn = $('#tr-to', m), amIn = $('#tr-amount', m), err = $('#tr-err', m), sendBtn = $('#tr-send', m);
  m.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
    const q = b.dataset.q;
    amIn.value = q === 'max' ? Math.floor(w.balance) : q === 'half' ? Math.floor(w.balance / 2) : q;
  }));
  let players = [];
  getPlayers(backend, w).then((list) => {
    players = list.filter((p) => p.uid !== w.uid).sort((a, b) => a.pseudo.localeCompare(b.pseudo));
    $('#tr-players', m).innerHTML = players.map((p) => `<option value="${esc(p.pseudo)}"></option>`).join('');
  }).catch(() => {});
  toIn.focus();
  sendBtn.onclick = async () => {
    err.textContent = '';
    const name = toIn.value.trim().toLowerCase();
    const amount = Math.floor(+amIn.value);
    if (!players.length) { try { players = (await getPlayers(backend, w, true)).filter((p) => p.uid !== w.uid); } catch {} }
    const target = players.find((p) => p.pseudo.toLowerCase() === name);
    if (!target) { err.textContent = name === w.pseudo.toLowerCase() ? 'Tu ne peux pas t\'envoyer des Brundles à toi-même' : 'Joueur introuvable'; return; }
    if (!(amount > 0)) { err.textContent = 'Montant invalide'; return; }
    if (amount > w.balance) { err.textContent = 'Solde insuffisant'; return; }
    sendBtn.disabled = true;
    try {
      await w.sendTo(target, amount);
      sfx.coin();
      toast(`${fmt(amount)} ${CUR} envoyés à <b>${esc(target.pseudo)}</b>`, 'win');
      close();
    } catch (e) {
      err.textContent = e.message;
      sendBtn.disabled = false;
    }
  };
}

function claimDaily() {
  if (!wallet.dailyAvailable()) {
    if (bonusSpins(wallet)) { openDailyWheel(wallet, null, { bonus: true }); return; } // tour bonus gagné dans une caisse
    toast(`Roue déjà tournée aujourd'hui. Reviens dans ${countdown()}`); return;
  }
  openDailyWheel(wallet);
}

/* ================================ ROUTEUR ================================ */
function route() {
  if (!wallet) return;
  const key = (location.hash.replace(/^#\/?/, '') || 'lobby').split('?')[0];
  const r = ROUTES[key] || ROUTES.lobby;
  const view = $('#view');
  if (!view) return;
  if (cleanupView) { try { cleanupView(); } catch (e) { console.error(e); } cleanupView = null; }
  if (updater && updater.pending) { updater.apply(); return; }
  view.innerHTML = '';
  view.className = 'view view-' + (ROUTES[key] ? key : 'lobby');
  const cur = ROUTES[key] ? key : 'lobby';
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === cur));
  $$('.nav-group').forEach((g) => {
    const on = ROUTES[cur].group === g.dataset.g;
    g.classList.toggle('active', on);
    g.classList.remove('open');
    // le bouton du groupe affiche le jeu en cours
    $('.nav-gbtn .ni', g).innerHTML = icon(on ? ROUTES[cur].icon : GROUPS[g.dataset.g].icon);
    $('.nav-gbtn .nl', g).innerHTML = `${on ? ROUTES[cur].label : GROUPS[g.dataset.g].label} <i class="chev">${icon('chev')}</i>`;
  });
  window.scrollTo(0, 0);
  const ctx = { wallet, backend, social, navigate: (k) => (location.hash = '#/' + k), isAdmin: () => adminP || Promise.resolve(false) };
  const boardTitle = BOARD_GAMES[key];
  if (boardTitle) {
    // jeu + classement du jeu à côté
    view.classList.add('has-board');
    view.innerHTML = '<div class="with-board"><div class="game-main"></div><aside class="game-board"></aside></div>';
    const c1 = r.mount($('.game-main', view), ctx);
    const c2 = mountBoard($('.game-board', view), key, boardTitle, ctx);
    // défis à relever : à côté de la machine, sous le classement
    const gb = document.createElement('div'); gb.className = 'game-goals'; $('.game-board', view).append(gb);
    const c3 = mountGoals(gb, key, { wallet, challenges });
    cleanupView = () => { try { c1 && c1(); } finally { c2(); c3(); } };
  } else if (ROUTES[key] && ROUTES[key].group === 'free') {
    // mini-jeux : le jeu, puis les défis à relever en dessous
    view.innerHTML = '<div class="game-solo"></div><div class="game-goals solo"></div>';
    const c1 = r.mount($('.game-solo', view), ctx);
    const c3 = mountGoals($('.game-goals', view), key, { wallet, challenges });
    cleanupView = () => { try { c1 && c1(); } finally { c3(); } };
  } else {
    cleanupView = r.mount(view, ctx) || null;
  }
}

/* ================================ LOBBY ================================ */
function renderLobbyDaily(box) {
  const n = wallet.nextStreak();
  if (wallet.dailyAvailable()) {
    if (box.dataset.state !== 'ready') {
      box.dataset.state = 'ready';
      box.innerHTML = `<div class="daily-icon">${icon('wheel')}</div><div><h3>La roue du jour t'attend !</h3><p>De ${fmt(Math.min(...CONFIG.DAILY_WHEEL))} à ${fmt(Math.max(...CONFIG.DAILY_WHEEL))} ${CUR}${n > 1 ? `, <b>×${(Math.min(CONFIG.STREAK_MAX, 1 + CONFIG.STREAK_STEP * (n - 1))).toLocaleString('fr-FR')}</b> grâce à ta série de ${n} jours` : ', et plus tu reviens chaque jour, plus ça rapporte'}.</p></div><button class="btn btn-gold btn-lg pulse">Tourner la roue</button>`;
      $('button', box).onclick = claimDaily;
    }
  } else {
    box.dataset.state = 'wait';
    const st = wallet.p.streak || {};
    box.innerHTML = `<div class="daily-icon wait">${icon('hourglass')}</div><div><h3>Roue tournée${st.n > 1 ? ` · série de ${st.n} jours` : ''}</h3><p>Prochaine roue dans <b class="mono">${countdown()}</b> (minuit, heure de Paris)</p></div>`;
  }
}

/* ---------- tableau de bord de l'accueil : jackpot, quêtes, VIP ---------- */
function questsHTML() {
  const d = today(wallet);
  const lv = ['Facile', 'Moyenne', 'Difficile'];
  const qi = questInfo(), r = (x) => bonusHTML(x, qi);
  return `<div class="dash-head">${icon('check')}<b>Quêtes du jour</b><small class="muted">renouvelées à minuit</small></div>
    <ul class="quests">${d.quests.map((q) => `<li class="${q.done ? 'done' : ''}"><div><span class="q-lv q${q.tier}">${lv[q.tier]}</span>${esc(questText(q))}</div>
      <div class="q-bar"><i style="width:${Math.min(100, (q.p / q.n) * 100)}%"></i></div><small>${q.done ? 'Terminée' : `${fmt(q.p)} / ${fmt(q.n)}`} · ${r(questReward(q))}</small></li>`).join('')}</ul>
    <p class="muted q-bonus">${d.bonus ? 'Bonus de la journée récupéré !' : `Les 3 terminées : ${r(CONFIG.QUEST_BONUS)} ${CUR} de bonus`}</p>`;
}
function vipHTML() {
  const v = vipOf(wallet.stats.totalWagered);
  const pct = vipProgress(wallet.stats.totalWagered);
  const pot = rakePot(wallet);
  return `<div class="dash-head">${icon('star')}<b>Rang VIP</b><button type="button" class="btn btn-ghost btn-sm" data-vip>Tous les rangs</button></div>
    <div class="vip-now"><button type="button" class="vip-badge big vip-${v.id}" style="--vc:${v.color}" data-vip>${v.name}</button><small>${v.rb ? `Gains gratuits <b class="gold">${xMult(v.mult)}</b> (roue du jour, quêtes, quiz, mot du jour…) · rakeback ${pctFmt(v.rb)} sur chaque mise` : 'Pas encore d\'avantage : mise 10 000 au total pour devenir Tamarin (gains gratuits ×1,2)'}</small></div>
    ${v.next ? `<div class="vip-pct"><div class="q-bar vip"><i style="width:${pct}%;background:${v.next.color}"></i></div><b>${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</b></div><small class="muted">Prochain rang : <b>${v.next.name}</b> à ${fmt(v.next.min)} misés · bonus <b class="gold">+${fmt(v.next.up)}</b> · gains gratuits ${xMult(v.next.mult)}</small>` : '<small class="muted">Rang maximum atteint !</small>'}
    <div class="rake-row"><div><small class="muted">Cagnotte de rakeback</small><b>${money(pot)}</b></div><button class="btn btn-gold btn-sm" id="rk-claim" ${pot >= 1 ? '' : 'disabled'}>Récupérer</button></div>`;
}
// Défi de la jungle (remplace le jackpot sur l'accueil ; le jackpot reste affiché à côté de la slot)
const mmss = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const PLACE = ['1er', '2e', '3e'], MEDAL = ['#f5c542', '#cfd8dc', '#d08a4a'];
function challengeHTML(v) {
  const c = v.c, info = challengeInfo(challengeMult(wallet));
  const status = v.claimed ? `<div class="ch-status win">${icon('trophy')}Tu es ${v.claimed === 1 ? '<b>1er</b>' : `<b>${PLACE[v.claimed - 1]}</b>`} sur le podium !</div>`
    : v.full ? `<div class="ch-status lost">${icon('flag')}Podium complet. Prochain défi dans <b class="mono ch-time">${mmss(v.end - Date.now())}</b></div>`
    : v.error ? `<div class="ch-status lost">${esc(v.error)}</div>`
    : v.done ? '<div class="ch-status">Défi réussi, validation en cours…</div>'
    : `<div class="ch-status open">${v.next === 1 ? 'Personne ne l\'a encore réussi : fonce !' : `Encore ${4 - v.next} place${v.next < 3 ? 's' : ''} sur le podium : fonce !`}</div>`;
  const prog = c.n > 1 && !v.claimed && !v.full ? `<div class="q-bar"><i style="width:${Math.min(100, (v.p / c.n) * 100)}%"></i></div><small class="muted">${v.p} / ${c.n}</small>` : '';
  const podium = `<ol class="ch-podium">${[1, 2, 3].map((k) => {
    const x = (v.podium || []).find((y) => y.place === k), me = x && x.uid === wallet.uid;
    return `<li class="pl${k}${x ? ' taken' : ''}${me ? ' me' : ''}" style="--mc:${MEDAL[k - 1]}"><span class="ch-medal">${k}</span>
      <span class="ch-who">${x ? `<button type="button" class="pl-link" data-player="${esc(x.uid)}">${esc(x.pseudo)}</button>` : '<i class="muted">libre</i>'}</span>
      <b class="ch-amt">${x && x.amount ? `+${fmt(x.amount)}` : bonusHTML(c.prize * PODIUM[k - 1], info, { total: v.prizes[k - 1] })}</b></li>`;
  }).join('')}</ol>`;
  const hist = (v.history || []).filter((h) => h.slot !== v.slot).slice(0, 3);
  return `<div class="dash-head">${icon('flag')}<b>Défi de la jungle</b><small class="ch-clock" title="Temps restant">${icon('hourglass')}<b class="mono ch-time">${mmss(v.end - Date.now())}</b></small></div>
    <div class="ch-tags"><span class="q-lv q${c.tier}">${['Facile', 'Moyen', 'Difficile'][c.tier]}</span><span class="ch-kind">${c.kind === 'casino' ? 'Casino' : 'Mini-jeu'}</span></div>
    <p class="ch-text">${esc(c.text)}${c.kind === 'casino' ? ` <small class="muted">(mise d'au moins ${fmt(MIN_BET)})</small>` : ''}</p>
    ${prog}
    ${podium}
    ${status}
    <div class="ch-foot">${!v.claimed && !v.full && c.game !== 'lobby' ? `<a class="btn btn-gold btn-sm" href="${challengeRoute(c)}">Y aller ${icon('arrow')}</a>` : ''}
      <small class="muted">Un nouveau défi toutes les 12 min, 3 places récompensées${hist.length ? ` · derniers vainqueurs : ${hist.map((h) => `<b>${esc(h.pseudo)}</b>`).join(', ')}` : ''}</small></div>`;
}
let feedAll = false;
const feedOpen = new Set();
function feedHTML(st) {
  const list = ((st && st.entries) || []).filter((e) => e.kind !== 'chat');
  if (!list.length) return '<p class="muted">Rien pour l\'instant… Les gros gains, les succès, les quêtes et les jackpots de tout le monde apparaîtront ici.</p>';
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
  const groups = groupFeed(list);
  const n = feedAll ? 30 : 10;
  const ic = (e) => icon(e.kind === 'feat' && ROUTES[e.game] ? ROUTES[e.game].icon : FEED_ICON[e.kind] || 'bolt');
  const merged = (g) => g.items[0].kind === 'ach' || g.items[0].kind === 'achs';
  return `<ul class="feed">${groups.slice(0, n).map((g) => {
    const e = g.items[0], more = g.items.length - 1, isOpen = feedOpen.has(g.key);
    const chip = more && !merged(g) ? `<button type="button" class="fd-count" data-fdx="${esc(g.key)}" title="${isOpen ? 'Replier' : 'Voir le détail'}">+${more}</button>` : '';
    const sub = more && !merged(g) && isOpen ? `<ul class="fd-sub">${g.items.slice(1).map((x) => `<li><span>${esc(feedText(x))}</span><small>${ago(x.at)}</small></li>`).join('')}</ul>` : '';
    return `<li class="fd-${e.kind}${more ? ' fd-group' : ''}"><span class="fd-ic">${ic(e)}</span><span class="fd-txt">${groupRich(g)} ${chip}${sub}</span><small>${ago(e.at)}</small></li>`;
  }).join('')}</ul>${groups.length > 10 ? `<button type="button" class="feed-more" data-feedmore>${feedAll ? 'Voir moins' : `Voir plus (${Math.min(30, groups.length)})`}</button>` : ''}`;
}

/* ================= PANNEAU « EN DIRECT » + CHAT (accueil et côté de l'écran) ================= */
const hhmm = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const chatReadKey = () => 'chibouk_chat_read_' + (wallet ? wallet.uid : '');
let chatsOpen = 0; // panneaux de chat visibles (le fil est relu plus souvent tant qu'il y en a un)
function chatListHTML(st) {
  const list = ((st && st.entries) || []).filter((e) => e.kind === 'chat').sort((a, b) => a.at - b.at);
  const msgs = list.map((e) => `<li class="${e.uid === wallet.uid ? 'me' : ''}"><div class="ch-head"><button type="button" class="pl-link ch-who" data-player="${esc(e.uid)}">${esc(e.pseudo)}</button>${tagsHTML({ tags: e.tg })}<small>${hhmm(e.at)}</small></div><span class="ch-t">${esc(e.text || '')}</span></li>`).join('');
  const pend = chat && chat.pending ? `<li class="me pending"><div class="ch-head"><b>${esc(wallet.pseudo)}</b><small data-chwait>envoi dans ${Math.ceil(chat.waitMs / 1000)} s</small></div><span class="ch-t">${esc(chat.pending)}</span></li>` : '';
  return msgs || pend ? msgs + pend : '<li class="muted ch-empty">Personne n\'a encore rien dit. Lance la discussion !</li>';
}
function panelInner() {
  return `<div class="fp-tabs"><button type="button" data-ft="feed">${icon('bolt')}En direct</button><button type="button" data-ft="chat">${icon('send')}Chat<i class="fp-unread" hidden></i></button></div>
    <div class="fp-body fp-feed"></div>
    <div class="fp-body fp-chat" hidden><ul class="ch-list"></ul>
      <form class="ch-form" autocomplete="off"><input class="bet-input ch-in" maxlength="200" placeholder="Ton message…"><button class="btn btn-gold btn-sm" type="submit">${icon('send')}</button></form>
      <small class="ch-note muted">1 message par minute. Historique des 80 derniers messages, le même sur tous les appareils (relu toutes les 45 s quand le chat est ouvert).</small></div>`;
}
// Remplit un panneau et le garde à jour ; renvoie la fonction de nettoyage
function bindPanel(root) {
  if (!root || !social) return () => {};
  root.innerHTML = panelInner();
  let tab = 'feed', last = null, visible = false;
  try { tab = localStorage.getItem('chibouk_fp_tab') === 'chat' ? 'chat' : 'feed'; } catch {}
  const feedBox = $('.fp-feed', root), list = $('.ch-list', root), unread = $('.fp-unread', root);
  const readAt = () => { try { return +localStorage.getItem(chatReadKey()) || 0; } catch { return 0; } };
  const markRead = () => { try { localStorage.setItem(chatReadKey(), String(Date.now())); } catch {} };
  const isShown = () => root.offsetParent !== null && !document.hidden;
  const setVisible = (v) => { if (v === visible) return; visible = v; chatsOpen += v ? 1 : -1; social.fast = chatsOpen > 0; };
  function renderChat() {
    if (!last) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = chatListHTML(last);
    if (atBottom || tab === 'chat') list.scrollTop = list.scrollHeight;
    const r = readAt(), n = last.entries.filter((e) => e.kind === 'chat' && e.uid !== wallet.uid && e.at > r).length;
    if (tab === 'chat' && isShown()) { if (n) markRead(); unread.hidden = true; } else { unread.hidden = !n; unread.textContent = n > 9 ? '9+' : n; }
  }
  function render() { if (!last) return; feedBox.innerHTML = feedHTML(last); renderChat(); }
  function show() {
    $$('[data-ft]', root).forEach((b) => b.classList.toggle('on', b.dataset.ft === tab));
    feedBox.hidden = tab !== 'feed'; $('.fp-chat', root).hidden = tab !== 'chat';
    setVisible(tab === 'chat' && isShown());
    renderChat();
  }
  $$('[data-ft]', root).forEach((b) => (b.onclick = () => { tab = b.dataset.ft; try { localStorage.setItem('chibouk_fp_tab', tab); } catch {} sfx.click(); show(); if (tab === 'chat') { list.scrollTop = list.scrollHeight; $('.ch-in', root).focus(); } }));
  $('.ch-form', root).onsubmit = (e) => {
    e.preventDefault();
    const inp = $('.ch-in', root), r = chat ? chat.send(inp.value) : 'Chat indisponible';
    if (r === 'sent' || r === 'queued') { inp.value = ''; sfx.click(); if (r === 'queued') toast('Message envoyé avec la prochaine synchro (1 message par minute)'); renderChat(); list.scrollTop = list.scrollHeight; }
    else toast(r, 'error');
  };
  // détail d'un groupe, « Voir plus », bulle des succès gardée dans le cadre
  const onClick = (e) => {
    const more = e.target.closest('[data-feedmore]'), fx = e.target.closest('[data-fdx]');
    if (fx) { const k = fx.dataset.fdx; feedOpen.has(k) ? feedOpen.delete(k) : feedOpen.add(k); } else if (more) feedAll = !feedAll; else return;
    render();
  };
  const onOver = (e) => {
    const a = e.target.closest('.fd-ach'); if (!a) return;
    const card = a.querySelector('.hover-card'); if (!card) return;
    card.style.left = '0px';
    const box = feedBox.getBoundingClientRect(), r = card.getBoundingClientRect();
    let dx = 0;
    if (r.right > box.right - 10) dx = box.right - 10 - r.right;
    if (r.left + dx < box.left + 10) dx = box.left + 10 - r.left;
    card.style.left = dx + 'px';
  };
  feedBox.addEventListener('click', onClick); feedBox.addEventListener('mouseover', onOver);
  const offS = social.subscribe((st) => { last = st; render(); });
  const offC = chat ? chat.subscribe(renderChat) : () => {};
  const iv = setInterval(() => { setVisible(tab === 'chat' && isShown()); const w8 = $('[data-chwait]', root); if (w8 && chat) w8.textContent = chat.pending ? `envoi dans ${Math.ceil(chat.waitMs / 1000)} s` : ''; }, 1000);
  const ago = setInterval(render, 60000);
  show();
  return () => { offS(); offC(); clearInterval(iv); clearInterval(ago); setVisible(false); };
}
// Panneau fixé sur le côté (ordinateur), repliable
let dockOff = null;
function mountDock() {
  if (dockOff) { dockOff(); dockOff = null; }
  const dock = $('#dock');
  if (!dock) return;
  let closed = false;
  try { closed = localStorage.getItem('chibouk_dock_closed') === '1'; } catch {}
  const apply = () => { document.body.classList.toggle('dock-closed', closed); $('.dock-toggle', dock).title = closed ? 'Afficher le direct et le chat' : 'Masquer le panneau'; };
  $('.dock-toggle', dock).onclick = () => { closed = !closed; try { localStorage.setItem('chibouk_dock_closed', closed ? '1' : '0'); } catch {} apply(); };
  apply();
  // le panneau commence sous la barre du haut (qui reste collée en haut, sous le bandeau éventuel)
  const top = () => { const tb = $('.topbar'); if (tb) document.documentElement.style.setProperty('--dock-top', Math.max(0, tb.getBoundingClientRect().bottom) + 'px'); };
  top();
  window.addEventListener('scroll', top, { passive: true }); window.addEventListener('resize', top);
  const off = bindPanel($('.dock-in', dock));
  dockOff = () => { off(); window.removeEventListener('scroll', top); window.removeEventListener('resize', top); };
}

function card(key, title, desc, tag, art) {
  return `<a class="game-card gc-${key}" href="#/${key}">
    <div class="gc-art">${art}</div>
    <div class="gc-body"><div class="gc-title"><span class="gc-logo">${icon(ROUTES[key].icon)}</span><h3>${title}</h3></div><p>${desc}</p><span class="gc-tag">${tag}</span></div>
  </a>`;
}

function mountLobby(view, { wallet: w }) {
  const s = w.stats;
  const casinoCards = [
    card('slots', 'Chibouk Slot', 'Machine à sous 5×3, 99 lignes, WILD ×2. 3 SCATTER = tours gratuits ×2. Jackpot commun !', 'RTP ≈ 100 %',
      `<div class="mini-reels">${['S', 'F', 'S'].map((x) => `<div>${symbolSVG(x)}</div>`).join('')}</div>`),
    card('jungle', 'Jungle Connect', 'Nouveau ! Grille 7×7 : 5 symboles reliés = gain, cascades à l\'infini, multiplicateurs jusqu\'à ×256 et tours gratuits du Masque Tribal.', 'RTP 99,5 %', jungleArtSVG()),
    card('craps', 'Craps', 'Nouveau ! La table de dés : Pass Line et Don\'t Pass avec cote réelle, Field, mises Place, Any 7…', 'RTP 98,6 à 100 %', crapsArtSVG()),
    card('blackjack', 'Blackjack du Singe', 'Blackjack 6 jeux, paie 3:2, mises annexes Perfect Pairs et 21+3, cartes en 3D.', 'RTP ≈ 99,5 %',
      `<div class="mini-cards"><div class="mc mc1">A<span>♠</span></div><div class="mc mc2 red">K<span>♥</span></div></div>`),
    card('roulette', 'Roulette Banane', 'Roulette européenne à un zéro, roue et bille animées.', 'RTP 97,3 %', `<div class="mini-wheel"></div>`),
    card('plinko', 'Plinkoko', 'Lâche des noix de coco, 3 niveaux de risque, jusqu\'à ×1000.', 'RTP 99 %', plinkoArtSVG()),
    card('crash', 'Crashibouk', 'Le multiplicateur grimpe : encaisse avant que la fusée explose.', 'RTP 99 %', crashArtSVG()),
    card('tower', 'Tower', 'Grimpe étage par étage : chaque banane fait monter le multi, une bombe et tout explose.', 'RTP 99 %', towerArtSVG()),
    card('mines', 'Mines', 'Choisis le nombre de mines : plus il y en a, plus chaque banane trouvée rapporte.', 'RTP 99 %', minesArtSVG()),
    card('dice', 'Dice', 'Choisis ta chance de 0,01 % à 98 % : plus elle est faible, plus le dé paie.', 'RTP 99 %', diceArtSVG()),
    card('hilo', 'Hi-Lo', 'Plus haut ou plus bas ? Chaque bonne réponse fait grimper le multiplicateur. Encaisse quand tu veux.', 'RTP 99 %', hiloArtSVG()),
    card('keno', 'Keno', 'Choisis jusqu\'à 10 numéros sur 40, 10 sont tirés. Jusqu\'à ×10 000 en risque élevé.', 'RTP 99 %', kenoArtSVG()),
    card('wheel', 'Roue du Singe', '30 cases, 3 niveaux de risque : petits gains fréquents ou une case à ×29,7.', 'RTP 99 %', wheelArtSVG()),
    card('limbo', 'Limbo', 'Fixe ta cible : si le multiplicateur tiré l\'atteint, tu gagnes mise × cible.', 'RTP 99 %', limboArtSVG()),
    card('scratch', 'Jeux à gratter', 'Trois tickets de 10 à 1 000 Brundles : gratte les cases, 3 montants identiques et c\'est gagné. Jusqu\'à 10 millions !', 'RTP 98 %', scratchArtSVG()),
  ];
  view.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <h1><a href="#/profile" class="hero-av" title="Mon profil">${Profile.avatarHTML(w.p, 'av-md')}</a>Salut <span class="gold">${esc(w.pseudo)}</span> !</h1>
        <p>Bienvenue au <b>Casino Chibouk</b></p>
        <div class="hero-bal">Ton solde : ${money(w.balance)}${w.vault ? `<small class="hero-vault">${icon('vault')} ${fmt(w.vault)} au coffre</small>` : ''}</div>
      </div>
      ${hangingMonkeySVG()}
    </section>
    <section class="dash">
      <div class="dash-card ch" id="dash-ch"></div>
      <div class="dash-card" id="dash-quests"></div>
      <div class="dash-card" id="dash-vip"></div>
    </section>
    <a class="fm-lobby" href="#/farm" id="fm-lobby"></a>
    <section class="lobby-sec" data-sec="feed">
    <h2 class="lobby-cat feed-cat"><button type="button" class="lc-toggle" aria-expanded="true">${icon('bolt')}En direct de la jungle<small class="lc-count">exploits de tout le monde et chat</small><span class="lc-chev">${icon('arrow')}</span></button></h2>
    <div class="lc-body"><div class="feed-box fp" id="feed-box"></div></div></section>
    <section class="lobby-sec" data-sec="casino">
    <h2 class="lobby-cat"><button type="button" class="lc-toggle" aria-expanded="true">${icon('chip')}Jeux de casino<small class="lc-count">${casinoCards.length} jeux</small><span class="lc-chev">${icon('arrow')}</span></button></h2>
    <div class="lc-body"><section class="games-grid">${casinoCards.join('')}</section></div></section>
    <section class="lobby-sec" data-sec="free">
    <h2 class="lobby-cat free"><button type="button" class="lc-toggle" aria-expanded="true">${icon('gift')}Mini-jeux gratuits<small class="lc-count">roue du jour, puzzles, quiz, jeux d'adresse</small>${freeMult(w) > 1 ? `<span class="vip-x big" title="Multiplicateur VIP sur tous les gains gratuits">VIP ${xMult(freeMult(w))}</span>` : ''}<span class="lc-chev">${icon('arrow')}</span></button></h2>
    <div class="lc-body">
    <section id="lobby-daily" class="daily-card"></section>
    <h3 class="sub-cat">Puzzle<small>mots, logique et mémoire</small></h3>
    <section class="games-grid free-grid">
      ${card('motus', 'Mot du jour', 'Le même mot pour tout le monde, 6 essais, la première lettre est donnée. Jusqu\'à +400 ' + CUR + '.', today(w).motus && today(w).motus.done ? 'Fait aujourd\'hui' : 'Une fois par jour', motusArtSVG())}
      ${card('crossword', 'Mots croisés', 'Une nouvelle grille à chaque partie, 3 tailles. Vérification gratuite, lettres à révéler si tu bloques.', `+${Crossword.CW_LEVELS[0].reward} à +${Crossword.CW_LEVELS[2].reward} ${CUR}`, crosswordArtSVG())}
      ${card('queens', 'Queens', 'Une reine par ligne, colonne et zone de couleur, sans jamais qu\'elles se touchent. Grilles de 7×7 à 9×9.', `+${Queens.QUEENS_LEVELS[0].reward} à +${Math.round(Queens.QUEENS_LEVELS[2].reward * 1.5)} ${CUR}`, queensArtSVG())}
      ${card('tango', 'Tango', 'Soleils et lunes à parts égales, jamais trois pareils d\'affilée, et respecte les signes = et ×.', `+${Tango.TANGO_LEVELS[0].reward} à +${Math.round(Tango.TANGO_LEVELS[2].reward * 1.5)} ${CUR}`, tangoArtSVG())}
      ${card('sudoku', 'Sudoku', 'Le grand classique en 3 niveaux, avec notes et bonus de vitesse.', `+${Sudoku.SUDOKU_INFO[0].reward} à +${Math.round(Sudoku.SUDOKU_INFO[2].reward * 1.5)} ${CUR}`, sudokuArtSVG())}
      ${card('demineur', 'Démineur', 'Déminer avant la fin du chrono : 9×9, 16×16 ou 16×30. Plus tu es rapide, plus ça rapporte.', `+${Demineur.MS_LEVELS[0].reward} à +${Demineur.MS_LEVELS[2].reward * 2} ${CUR}`, demineurArtSVG())}
      ${card('memory', 'Memory', 'Retrouve toutes les paires de cartes, de 8 à 18 paires. Bonus si tu fais peu d\'erreurs.', `+${Memory.MEMORY_LEVELS[0].reward} à +${Math.round(Memory.MEMORY_LEVELS[2].reward * 1.5)} ${CUR}`, memoryArtSVG())}
    </section>
    <h3 class="sub-cat">Quiz<small>culture générale et calcul</small></h3>
    <section class="games-grid free-grid">
      ${card('pinpoint', 'Pinpoint', 'Trouve le point commun entre des indices dévoilés un par un. Moins il en faut, plus ça rapporte.', `+${Pinpoint.PP_REWARDS[4]} à +${Pinpoint.PP_REWARDS[0]} ${CUR}`, pinpointArtSVG())}
      ${card('quiz', 'Calcul mental', `${CONFIG.QUIZ_QUESTIONS} calculs, ${CONFIG.QUIZ_SECONDS} s chacun : +${CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse, bonus pour un sans-faute.`, 'Gratuit', quizArtSVG())}
      ${card('capitals', 'Quiz capitales', `${CONFIG.QUIZ_QUESTIONS} questions dans les deux sens, mode facile ou expert (gains doublés).`, 'Gratuit', capitalsArtSVG())}
      ${card('flags', 'Quiz drapeaux', `${CONFIG.QUIZ_QUESTIONS} drapeaux à reconnaître parmi ${Flags.FLAGS.length} pays, mode facile ou expert.`, 'Gratuit', flagsArtSVG())}
      ${card('movies', 'Quiz ciné', `${CONFIG.QUIZ_QUESTIONS} questions sur 800 films cultes : réalisateurs, acteurs, années. +${CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse.`, 'Gratuit', moviesArtSVG())}
      ${card('culture', 'Culture G', `Nouveau ! ${CONFIG.QUIZ_QUESTIONS} questions de culture générale à écrire, parmi ${Culture.CULTURE_COUNT.toLocaleString('fr-FR')} questions sur 26 thèmes. Petites fautes tolérées.`, '+40 / bonne réponse', cultureArtSVG())}
      ${card('geo', 'Quiz géographie', `Nouveau ! ${CONFIG.QUIZ_QUESTIONS} pays à trouver en cliquant sur la carte du monde (${Geo.GEO_COUNT} pays), carte zoomable.`, '+15 à +40 / pays', geoArtSVG())}
      ${card('higher', 'Plus ou moins', 'Quel film a coûté le plus cher ? Enchaîne jusqu\'à 15 bonnes réponses.', 'Gratuit', higherArtSVG())}
    </section>
    <h3 class="sub-cat">Adresse<small>réflexes et précision</small></h3>
    <section class="games-grid free-grid">
      ${card('typing', 'Frappe éclair', 'Nouveau ! 60 secondes pour taper un maximum de mots. Combien de mots par minute ?', `+2 à +5 ${CUR} par mot`, typingArtSVG())}
      ${card('snake', 'Snake', 'Le serpent de la jungle a faim : mange un max de bananes sans te mordre la queue.', `+1 à +4 ${CUR} par banane`, snakeArtSVG())}
      ${card('breaker', 'Casse-briques', `Casse toutes les briques d'un niveau : +${CONFIG.BREAKER_REWARD} ${CUR}. Gratuit, sans mise.`, 'Gratuit',
        `<div class="mini-bricks">${Array.from({ length: 15 }, (_, i) => `<i style="--h:${(i * 37) % 360}"></i>`).join('')}</div>`)}
      <a class="game-card gc-ach" href="#/achievements">
        <div class="gc-art"><div class="ach-teaser"><b>${achSummary(w).done}</b><span>/ ${achSummary(w).total}</span></div></div>
        <div class="gc-body"><div class="gc-title"><span class="gc-logo">${icon('medal')}</span><h3>Succès</h3></div><p>Relève des défis sur chaque jeu : de +100 à +10 000 ${CUR} par succès débloqué.</p><span class="gc-tag">Récompenses</span></div>
      </a>
    </section>
    </div></section>
    <section class="mini-stats">
      <div><span>Total misé</span><b>${money(s.totalWagered)}</b></div>
      <div><span>Total gagné</span><b>${money(s.totalWon)}</b></div>
      <div><span>Bilan</span><b class="${s.totalWon - s.totalWagered >= 0 ? 'pos' : 'neg'}">${s.totalWon - s.totalWagered >= 0 ? '+' : ''}${fmt(s.totalWon - s.totalWagered)}</b></div>
      <div><span>Plus gros gain</span><b>${money(s.biggestWin)}</b></div>
      <a class="btn btn-ghost" href="#/cases">${icon('crate')}Caisses</a>
      <a class="btn btn-ghost" href="#/shop">${icon('shop')}Boutique</a>
      <a class="btn btn-ghost" href="#/ranking">${icon('trophy')}Classements</a>
      <a class="btn btn-ghost" href="#/stats">Mes stats ${icon('arrow')}</a>
    </section>`;
  renderLobbyDaily($('#lobby-daily', view));
  // catégories repliables (état mémorisé)
  let closed = {};
  try { closed = JSON.parse(localStorage.getItem('chibouk_lobby_closed') || '{}'); } catch {}
  $$('.lobby-sec', view).forEach((sec) => {
    const btn = $('.lc-toggle', sec), k = sec.dataset.sec;
    const apply = () => { sec.classList.toggle('closed', !!closed[k]); btn.setAttribute('aria-expanded', String(!closed[k])); };
    apply();
    btn.onclick = () => { closed[k] = !closed[k]; try { localStorage.setItem('chibouk_lobby_closed', JSON.stringify(closed)); } catch {} sfx.click(); apply(); };
  });
  // tableau de bord
  const dash = () => {
    const q = $('#dash-quests', view), v = $('#dash-vip', view);
    if (q) q.innerHTML = questsHTML();
    if (v) { v.innerHTML = vipHTML(); const b = $('#rk-claim', v); if (b) b.onclick = () => { const a = claimRake(w); if (a) { sfx.win(true); coinRain(25); toast(`+${fmt(a)} ${CUR} de rakeback récupérés !`, 'win'); } dash(); }; }
  };
  dash();
  // fil « En direct » + chat (sur ordinateur, le même panneau est aussi fixé sur le côté de l'écran)
  const offSocial = bindPanel($('#feed-box', view));
  let chState = null;
  const offCh = challenges ? challenges.subscribe((v) => { chState = v; const el = $('#dash-ch', view); if (el) el.innerHTML = challengeHTML(v); }) : () => {};
  const chClock = setInterval(() => { if (chState) $$('#dash-ch .ch-time', view).forEach((el) => { el.textContent = mmss(chState.end - Date.now()); }); }, 1000);
  let t = null;
  const off = w.on(() => {
    const hb = $('.hero-bal', view); if (hb) hb.innerHTML = `Ton solde : ${money(w.balance)}${w.vault ? `<small class="hero-vault">${icon('vault')} ${fmt(w.vault)} au coffre</small>` : ''}`;
    if (!t) t = setTimeout(() => { t = null; dash(); }, 400);
  });
  const farmBox = $('#fm-lobby', view);
  const farmCard = () => {
    if (!farmBox) return;
    if (!Farm.hasFarm(w.p)) { farmBox.innerHTML = `<span class="fm-l-art">${Farm.tileArt('F', 6)}</span><div class="fm-l-txt"><b>Ta ferme à bananes t'attend</b><small>Des singes récoltent des bananes pour toi, même quand tu n'es pas là. Revends-les contre des ${CUR} !</small></div><span class="btn btn-gold">Découvrir</span>`; return; }
    const fm = w.p.farm, cap = FarmCore.capacity(fm), rate = FarmCore.productionPerHour(fm) * FarmCore.boostAt(fm), full = fm.b >= cap - 0.5;
    const q = fm.q.length ? [...fm.q].sort((a, b) => a.end - b.end)[0] : null;
    farmBox.classList.toggle('full', full);
    farmBox.innerHTML = `<span class="fm-l-art">${Farm.tileArt('F', Math.min(12, Math.max(1, Math.round(FarmCore.levels(fm) / 4))))}</span>
      <div class="fm-l-txt"><b>Ma ferme à bananes</b><small>${fmt(Math.round(rate))} bananes/h · ${full ? '<span class="neg">entrepôt plein, la récolte est à l\'arrêt !</span>' : `plein dans ${Farm.dur(((cap - fm.b) / Math.max(1e-9, rate)) * FarmCore.HOUR)}`}${q ? ` · chantier fini dans ${Farm.dur(q.end - Date.now())}` : fm.q.length < fm.bu ? ' · bâtisseur disponible' : ''}</small>
        <div class="fm-bar"><i style="width:${Math.min(100, (fm.b / Math.max(1, cap)) * 100)}%" class="${full ? 'full' : ''}"></i></div></div>
      <span class="fm-l-stock">${Farm.ban(fm.b)}<small>/ ${fmt(cap)}</small></span>`;
  };
  farmCard();
  const farmIv = setInterval(farmCard, 5000);
  return () => { off(); offSocial(); offCh(); clearInterval(chClock); clearTimeout(t); clearInterval(farmIv); };
}

boot();
