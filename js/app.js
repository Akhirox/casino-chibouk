// Point d'entrée : authentification, coque du site, routeur, lobby, bonus quotidien
import { CONFIG } from './config.js';
import { createBackend } from './backend.js';
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
import * as Shop from './shop.js';
import { initQuests, today, questText, vipOf, vipProgress, VIP, cashbackInfo, claimCashback } from './progress.js';
import { createSocial, feedRich, FEED_ICON, jackpotChance, chanceText } from './social.js';
import { openVipModal } from './vip.js';
import { syncWeeks } from './weekly.js';
import { initHistory } from './history.js';
import { openDailyWheel } from './dailywheel.js';
import { mountBoard } from './gameboard.js';
import { initAchievements, achSummary, TIERS } from './achievements.js';
import * as AchPage from './achpage.js';
import * as News from './changelog.js';
import * as Stats from './stats.js';
import { createTracker } from './tracker.js';
import { getPlayers } from './players.js';
import * as Profile from './profile.js';
import { createTips } from './tips.js';

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
let quests = null;
let social = null;
let historyOff = null;
let weeksTimer = null;

const ROUTES = {
  lobby: { label: 'Accueil', icon: 'home', mount: mountLobby },
  slots: { label: 'Chibouk Slot', icon: 'slots', mount: Slots.mount, group: 'casino' },
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
  quiz: { label: 'Calcul mental', icon: 'quiz', mount: Quiz.mount, group: 'free' },
  capitals: { label: 'Capitales', icon: 'globe', mount: Capitals.mount, group: 'free' },
  flags: { label: 'Drapeaux', icon: 'flag', mount: Flags.mount, group: 'free' },
  movies: { label: 'Quiz ciné', icon: 'film', mount: Movies.mount, group: 'free' },
  higher: { label: 'Plus ou moins', icon: 'higher', mount: Higher.mount, group: 'free' },
  motus: { label: 'Mot du jour', icon: 'motus', mount: Motus.mount, group: 'free' },
  breaker: { label: 'Casse-briques', icon: 'breaker', mount: Breaker.mount, group: 'free' },
  shop: { label: 'Boutique', icon: 'shop', mount: Shop.mount },
  achievements: { label: 'Succès', icon: 'medal', mount: AchPage.mount },
  stats: { label: 'Stats', icon: 'stats', mount: Stats.mount },
  news: { label: 'Nouveautés', icon: 'scroll', mount: News.mount, nav: false },
  profile: { label: 'Mon profil', icon: 'user', mount: Profile.mount, nav: false },
};
const GROUPS = { casino: { label: 'Casino', icon: 'chip' }, free: { label: 'Gratuit', icon: 'gift' } };

// Jeux qui affichent leur classement à côté (clé de stats -> nom affiché)
const BOARD_GAMES = { slots: 'Chibouk Slot', blackjack: 'Blackjack', roulette: 'Roulette', plinko: 'Plinkoko', crash: 'Crashibouk', tower: 'Tower', mines: 'Mines', dice: 'Dice', hilo: 'Hi-Lo', keno: 'Keno', wheel: 'Roue du Singe', limbo: 'Limbo' };

// Menu : Accueil · Casino ▾ · Gratuit ▾ · Boutique · Succès · Stats
function navHTML() {
  const link = (k, r, cls = '') => `<a href="#/${k}" data-r="${k}" title="${r.label}" class="${cls}"><span class="ni">${icon(r.icon)}</span><span class="nl">${r.label}</span></a>`;
  const group = (g) => {
    const items = Object.entries(ROUTES).filter(([, r]) => r.group === g);
    return `<div class="nav-group" data-g="${g}"><button type="button" class="nav-gbtn ${g === 'free' ? 'nav-free' : ''}" aria-haspopup="true"><span class="ni">${icon(GROUPS[g].icon)}</span><span class="nl">${GROUPS[g].label} <i class="chev">${icon('chev')}</i></span></button>
      <div class="nav-pop ${g}"><div class="nav-pop-title">${GROUPS[g].label === 'Casino' ? 'Jeux de casino' : 'Jeux gratuits'}</div><div class="nav-pop-grid">${items.map(([k, r]) => link(k, r, g === 'free' ? 'nav-free' : '')).join('')}</div></div></div>`;
  };
  return link('lobby', ROUTES.lobby) + group('casino') + group('free') + ['shop', 'achievements', 'stats'].map((k) => link(k, ROUTES[k])).join('');
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
    if (social) { social.destroy(); social = null; }
    if (historyOff) { historyOff(); historyOff = null; }
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
      wallet = w;
      renderShell();
      route();
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

/* ================================ COQUE ================================ */
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
        <span class="sync-dot saved" title="Sauvegardé"></span>
        <button class="icon-btn send-btn" title="Envoyer des ${CUR}">${icon('send')}</button>
        <button class="icon-btn tracker-btn" title="Suivi de balance">${icon('chart')}</button>
        <button class="icon-btn mute-btn" title="Son">${icon(sfx.muted ? 'mute' : 'sound')}</button>
        <div class="user-menu"><button class="user-btn"><span class="ub-av">${Profile.avatarHTML(wallet.p, 'av-xs')}</span><span class="ub-name">${esc(wallet.pseudo)}</span> ▾</button>
          <div class="user-drop"><a href="#/profile">Mon profil</a><a href="#/shop">Boutique</a><a href="#/stats">Mes stats</a><a href="#/achievements">Mes succès</a><a href="#/news">Nouveautés</a><button class="send-menu">Envoyer des ${CUR}</button><button class="tip-menu">Un conseil du singe</button><button class="tip-toggle"></button><button class="logout">Se déconnecter</button></div></div>
      </div>
    </header>
    <main id="view"></main>
    <footer class="foot">Casino Chibouk <a href="#/news">V${News.VERSION} · Nouveautés</a> · argent fictif, aucune mise réelle · sauvegarde automatique toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s</footer>
  </div>`);
  app.append(shell);

  const balEl = $('.bal-amount', shell), pill = $('.balance-pill', shell);
  let shown = wallet.balance;
  wallet.on((evt) => {
    if (evt && evt.type === 'profile') $('.ub-av', shell).innerHTML = Profile.avatarHTML(wallet.p, 'av-xs');
    const nb = wallet.balance;
    if (nb !== shown) {
      pill.classList.remove('up', 'down'); void pill.offsetWidth;
      pill.classList.add(nb > shown ? 'up' : 'down');
      shown = nb;
    }
    balEl.textContent = fmt(nb);
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
  today(wallet);
  quests = initQuests(wallet, (q, bonus) => {
    if (bonus) { toast(`<span class="ach-toast">${icon('check')}<span><small>Quêtes du jour</small><b>Les 3 quêtes sont terminées !</b><em>+${fmt(CONFIG.QUEST_BONUS)} ${CUR} de bonus</em></span></span>`, 'ach', 5000); coinRain(30); }
    else toast(`<span class="ach-toast">${icon('check')}<span><small>Quête terminée</small><b>${esc(questText(q))}</b><em>+${fmt(q.r)} ${CUR}</em></span></span>`, 'ach', 4500);
    sfx.bonus();
  });
  social = createSocial(wallet, backend);
  syncWeeks(backend, wallet);
  weeksTimer = setInterval(() => wallet && syncWeeks(backend, wallet), 15 * 60000);
  tips = createTips(wallet);
  const tipToggle = $('.tip-toggle', shell);
  const tipLabel = () => { tipToggle.textContent = `Conseils automatiques : ${tips.off ? 'non' : 'oui'}`; };
  tipLabel();
  tipToggle.onclick = (e) => { e.stopPropagation(); tips.setOff(!tips.off); tipLabel(); toast(tips.off ? 'Le singe se tait. Tu peux toujours lui demander un conseil depuis ce menu.' : 'Le singe reprend du service !'); };
  $('.tip-menu', shell).onclick = () => tips.showNow();
  $('.send-btn', shell).onclick = openTransfer;
  $('.send-menu', shell).onclick = openTransfer;
  startInbox();
  $('.mute-btn', shell).onclick = (e) => { const m = sfx.toggle(); e.currentTarget.innerHTML = icon(m ? 'mute' : 'sound'); };
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
function startInbox() {
  const check = async () => {
    if (!wallet || document.visibilityState === 'hidden') return;
    const got = await wallet.checkInbox();
    for (const t of got) {
      toast(`${esc(t.fromPseudo)} t'a envoyé <b>${fmt(t.amount)} ${CUR}</b> !`, 'win', 5000);
    }
    if (got.length) { sfx.coin(); coinRain(Math.min(40, 10 + got.length * 8)); }
  };
  clearInterval(inboxTimer);
  inboxTimer = setInterval(check, CONFIG.INBOX_INTERVAL_MS);
  if (window.__inboxVis) document.removeEventListener('visibilitychange', window.__inboxVis);
  window.__inboxVis = () => { if (document.visibilityState === 'visible') check(); };
  document.addEventListener('visibilitychange', window.__inboxVis);
  setTimeout(check, 1500);
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
  if (!wallet.dailyAvailable()) { toast(`Roue déjà tournée aujourd'hui. Reviens dans ${countdown()}`); return; }
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
  const ctx = { wallet, backend, social, navigate: (k) => (location.hash = '#/' + k) };
  const boardTitle = BOARD_GAMES[key];
  if (boardTitle) {
    // jeu + classement du jeu à côté
    view.classList.add('has-board');
    view.innerHTML = '<div class="with-board"><div class="game-main"></div><aside class="game-board"></aside></div>';
    const c1 = r.mount($('.game-main', view), ctx);
    const c2 = mountBoard($('.game-board', view), key, boardTitle, ctx);
    cleanupView = () => { try { c1 && c1(); } finally { c2(); } };
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
  return `<div class="dash-head">${icon('check')}<b>Quêtes du jour</b><small class="muted">renouvelées à minuit</small></div>
    <ul class="quests">${d.quests.map((q) => `<li class="${q.done ? 'done' : ''}"><div><span class="q-lv q${q.tier}">${lv[q.tier]}</span>${esc(questText(q))}</div>
      <div class="q-bar"><i style="width:${Math.min(100, (q.p / q.n) * 100)}%"></i></div><small>${q.done ? 'Terminée' : `${fmt(q.p)} / ${fmt(q.n)}`} · +${fmt(q.r)}</small></li>`).join('')}</ul>
    <p class="muted q-bonus">${d.bonus ? 'Bonus de la journée récupéré !' : `Les 3 terminées : +${fmt(CONFIG.QUEST_BONUS)} ${CUR} de bonus`}</p>`;
}
function vipHTML() {
  const v = vipOf(wallet.stats.totalWagered);
  const cb = cashbackInfo(wallet);
  const pct = vipProgress(wallet.stats.totalWagered);
  return `<div class="dash-head">${icon('star')}<b>Rang VIP</b><button type="button" class="btn btn-ghost btn-sm" data-vip>Tous les rangs</button></div>
    <div class="vip-now"><button type="button" class="vip-badge big vip-${v.id}" style="--vc:${v.color}" data-vip>${v.name}</button><small>${v.cb ? `${Math.round(v.cb * 100)} % de tes pertes de la semaine remboursées le lundi, +${Math.round(v.wheel * 100)} % sur la roue du jour${v.quest ? `, +${Math.round(v.quest * 100)} % sur les quêtes` : ''}` : 'Pas encore d\'avantage : mise 25 000 au total pour devenir Macaque'}</small></div>
    ${v.next ? `<div class="vip-pct"><div class="q-bar vip"><i style="width:${pct}%;background:${v.next.color}"></i></div><b>${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</b></div><small class="muted">Prochain rang : <b>${v.next.name}</b> à ${fmt(v.next.min)} misés (encore ${fmt(v.next.min - wallet.stats.totalWagered)})</small>` : '<small class="muted">Rang maximum atteint !</small>'}
    ${cb.amount ? `<button class="btn btn-gold wide" id="cb-claim">Récupérer ${fmt(cb.amount)} ${CUR} remboursés</button>` : `<small class="muted cb-note">${cb.loss === 0 && wallet.p.lastWeek && wallet.p.lastWeek.cb ? 'Remboursement de la semaine dernière déjà récupéré.' : 'Le remboursement de la semaine arrive lundi (pertes nettes aux jeux de casino).'}</small>`}`;
}
// mise actuelle de la slot (mémorisée) pour afficher la chance de jackpot
const jpBet = () => { try { const v = Math.floor(+localStorage.getItem('chibouk_slot_total')); return v >= 10 ? v : 100; } catch { return 100; } };
function jackpotHTML(st) {
  const last = st && st.last && st.last.lastPseudo ? `Dernier gagnant : <b>${esc(st.last.lastPseudo)}</b> (${fmt(st.last.lastAmount)})` : 'Personne ne l\'a encore remporté !';
  return `<div class="dash-head">${icon('trophy')}<b>Jackpot commun</b></div>
    <div class="jp-amount" id="jp-amount">${money(st ? st.jackpot : CONFIG.JACKPOT_SEED)}</div>
    <small class="muted">1 % de chaque mise à la Chibouk Slot l'alimente. Il peut tomber sur n'importe quel spin, plus souvent avec une grosse mise.</small>
    <small class="jp-odds">Ta chance par spin à ${fmt(jpBet())} : <b>${chanceText(jackpotChance(jpBet(), st ? st.jackpot : CONFIG.JACKPOT_SEED))}</b></small>
    <small class="jp-last">${last}</small>
    <a class="btn btn-ghost btn-sm" href="#/slots">Tenter ma chance ${icon('arrow')}</a>`;
}
let feedAll = false;
function feedHTML(st) {
  const list = (st && st.entries) || [];
  if (!list.length) return '<p class="muted">Rien pour l\'instant… Les gros gains, les succès, les quêtes et les jackpots de tout le monde apparaîtront ici.</p>';
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
  const n = feedAll ? 30 : 10;
  return `<ul class="feed">${list.slice(0, n).map((e) => `<li class="fd-${e.kind}"><span class="fd-ic">${icon(FEED_ICON[e.kind] || 'bolt')}</span><span class="fd-txt">${feedRich(e)}</span><small>${ago(e.at)}</small></li>`).join('')}</ul>${list.length > 10 ? `<button type="button" class="feed-more" data-feedmore>${feedAll ? 'Voir moins' : `Voir les ${Math.min(30, list.length)} derniers`}</button>` : ''}`;
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
  ];
  view.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <h1><a href="#/profile" class="hero-av" title="Mon profil">${Profile.avatarHTML(w.p, 'av-md')}</a>Salut <span class="gold">${esc(w.pseudo)}</span> !</h1>
        <p>Bienvenue au <b>Casino Chibouk</b></p>
        <div class="hero-bal">Ton solde : ${money(w.balance)}</div>
      </div>
      ${hangingMonkeySVG()}
    </section>
    <section class="dash">
      <div class="dash-card jp" id="dash-jp"></div>
      <div class="dash-card" id="dash-quests"></div>
      <div class="dash-card" id="dash-vip"></div>
    </section>
    <section class="lobby-sec" data-sec="feed">
    <h2 class="lobby-cat feed-cat"><button type="button" class="lc-toggle" aria-expanded="true">${icon('bolt')}En direct de la jungle<small class="lc-count">gros gains, succès, quêtes, jackpots, boutique…</small><span class="lc-chev">${icon('arrow')}</span></button></h2>
    <div class="lc-body"><div class="feed-box" id="feed-box"></div></div></section>
    <section class="lobby-sec" data-sec="casino">
    <h2 class="lobby-cat"><button type="button" class="lc-toggle" aria-expanded="true">${icon('chip')}Jeux de casino<small class="lc-count">${casinoCards.length} jeux</small><span class="lc-chev">${icon('arrow')}</span></button></h2>
    <div class="lc-body"><section class="games-grid">${casinoCards.join('')}</section></div></section>
    <section class="lobby-sec" data-sec="free">
    <h2 class="lobby-cat free"><button type="button" class="lc-toggle" aria-expanded="true">${icon('gift')}Gagner des ${CUR} gratuitement<small class="lc-count">roue du jour, quiz, mot du jour, casse-briques</small><span class="lc-chev">${icon('arrow')}</span></button></h2>
    <div class="lc-body">
    <section id="lobby-daily" class="daily-card"></section>
    <section class="games-grid free-grid">
      ${card('motus', 'Mot du jour', 'Le même mot pour tout le monde, 6 essais, la première lettre est donnée. Jusqu\'à +400 ' + CUR + '.', today(w).motus && today(w).motus.done ? 'Fait aujourd\'hui' : 'Une fois par jour', motusArtSVG())}
      ${card('quiz', 'Calcul mental', `${CONFIG.QUIZ_QUESTIONS} calculs, ${CONFIG.QUIZ_SECONDS} s chacun : +${CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse, bonus pour un sans-faute.`, 'Gratuit', quizArtSVG())}
      ${card('capitals', 'Quiz capitales', `${CONFIG.QUIZ_QUESTIONS} questions dans les deux sens, mode facile ou expert (gains doublés).`, 'Gratuit', capitalsArtSVG())}
      ${card('flags', 'Quiz drapeaux', `${CONFIG.QUIZ_QUESTIONS} drapeaux à reconnaître parmi ${Flags.FLAGS.length} pays, mode facile ou expert.`, 'Gratuit', flagsArtSVG())}
      ${card('movies', 'Quiz ciné', `${CONFIG.QUIZ_QUESTIONS} questions sur 800 films cultes : réalisateurs, acteurs, années. +${CONFIG.QUIZ_PER_CORRECT} ${CUR} par bonne réponse.`, 'Gratuit', moviesArtSVG())}
      ${card('higher', 'Plus ou moins', 'Quel film a coûté le plus cher ? Enchaîne jusqu\'à 15 bonnes réponses.', 'Gratuit', higherArtSVG())}
      ${card('breaker', 'Casse-briques', `Casse toutes les briques d'un niveau : +${CONFIG.BREAKER_REWARD} ${CUR}. Gratuit, sans mise.`, 'Gratuit',
        `<div class="mini-bricks">${Array.from({ length: 15 }, (_, i) => `<i style="--h:${(i * 37) % 360}"></i>`).join('')}</div>`)}
      <a class="game-card gc-ach" href="#/achievements">
        <div class="gc-art"><div class="ach-teaser"><b>${achSummary(w).done}</b><span>/ ${achSummary(w).total}</span></div></div>
        <div class="gc-body"><div class="gc-title"><span class="gc-logo">${icon('medal')}</span><h3>Succès</h3></div><p>Relève des défis sur chaque jeu : de +100 à +10 000 ${CUR} par succès débloqué.</p><span class="gc-tag">Récompenses</span></div>
      </a>
    </section></div></section>
    <section class="mini-stats">
      <div><span>Total misé</span><b>${money(s.totalWagered)}</b></div>
      <div><span>Total gagné</span><b>${money(s.totalWon)}</b></div>
      <div><span>Bilan</span><b class="${s.totalWon - s.totalWagered >= 0 ? 'pos' : 'neg'}">${s.totalWon - s.totalWagered >= 0 ? '+' : ''}${fmt(s.totalWon - s.totalWagered)}</b></div>
      <div><span>Plus gros gain</span><b>${money(s.biggestWin)}</b></div>
      <a class="btn btn-ghost" href="#/shop">${icon('shop')}Boutique</a>
      <a class="btn btn-ghost" href="#/stats">Stats & classement ${icon('arrow')}</a>
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
  let lastSocial = null;
  const dash = () => {
    const q = $('#dash-quests', view), v = $('#dash-vip', view);
    if (q) q.innerHTML = questsHTML();
    if (v) { v.innerHTML = vipHTML(); const b = $('#cb-claim', v); if (b) b.onclick = () => { const a = claimCashback(w); if (a) { sfx.win(true); coinRain(30); toast(`+${fmt(a)} ${CUR} remboursés, merci de ta fidélité !`, 'win'); } dash(); }; }
  };
  dash();
  let jpShown = null;
  const offSocial = social ? social.subscribe((st) => {
    lastSocial = st;
    const jp = $('#dash-jp', view), fb = $('#feed-box', view);
    if (jp) {
      if (jpShown === null) jp.innerHTML = jackpotHTML(st);
      else if (jpShown !== st.jackpot) { jp.innerHTML = jackpotHTML(st); const el = $('#jp-amount', jp); if (el) countUp(el, st.jackpot, { from: jpShown, ms: 1200, format: (x) => money(x) }); }
      jpShown = st.jackpot;
    }
    if (fb) fb.innerHTML = feedHTML(st);
  }) : () => {};
  let t = null;
  const off = w.on(() => {
    const hb = $('.hero-bal', view); if (hb) hb.innerHTML = `Ton solde : ${money(w.balance)}`;
    if (!t) t = setTimeout(() => { t = null; dash(); }, 400);
  });
  const ago = setInterval(() => { const fb = $('#feed-box', view); if (fb && lastSocial) fb.innerHTML = feedHTML(lastSocial); }, 60000);
  view.addEventListener('click', (e) => { if (e.target.closest('[data-feedmore]')) { feedAll = !feedAll; const fb = $('#feed-box', view); if (fb && lastSocial) fb.innerHTML = feedHTML(lastSocial); } });
  return () => { off(); offSocial(); clearTimeout(t); clearInterval(ago); };
}

boot();
