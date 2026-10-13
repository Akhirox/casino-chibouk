// Point d'entrée : authentification, coque du site, routeur, lobby, bonus quotidien
import { CONFIG } from './config.js';
import { createBackend } from './backend.js';
import { Wallet, msUntilParisMidnight } from './wallet.js';
import { h, $, $$, fmt, money, esc, toast, modal, coinRain, CUR } from './ui.js';
import { monkeySVG, goldMonkeySVG, hangingMonkeySVG, coinSVG, symbolSVG, icon, plinkoArtSVG, crashArtSVG, towerArtSVG, minesArtSVG, diceArtSVG } from './art.js';
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
import * as Stats from './stats.js';
import { createTracker } from './tracker.js';
import { getPlayers } from './players.js';

const app = $('#app');
let backend = null;
let wallet = null;
let cleanupView = null;
let signupPromise = null;
let authToken = 0;
let headerTimer = null;
let tracker = null;
let inboxTimer = null;

const ROUTES = {
  lobby: { label: 'Accueil', icon: 'home', mount: mountLobby },
  slots: { label: 'Slot', icon: 'slots', mount: Slots.mount },
  blackjack: { label: 'Blackjack', icon: 'blackjack', mount: Blackjack.mount },
  roulette: { label: 'Roulette', icon: 'roulette', mount: Roulette.mount },
  plinko: { label: 'Plinkoko', icon: 'plinko', mount: Plinko.mount },
  crash: { label: 'Crashibouk', icon: 'crash', mount: Crash.mount },
  tower: { label: 'Tower', icon: 'tower', mount: Tower.mount },
  mines: { label: 'Mines', icon: 'mines', mount: Mines.mount },
  dice: { label: 'Dice', icon: 'dice', mount: Dice.mount },
  breaker: { label: 'Briques', icon: 'breaker', mount: Breaker.mount },
  stats: { label: 'Stats', icon: 'stats', mount: Stats.mount },
};

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
  backend.onAuth(async (user) => {
    const token = ++authToken;
    if (tracker) { tracker.destroy(); tracker = null; }
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
      <p class="auth-sub">Le casino le plus singe de la jungle. ${fmt(CONFIG.DAILY_BONUS)} ${CUR} offerts chaque jour.</p>
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
      <nav class="nav">${Object.entries(ROUTES).map(([k, r]) => `<a href="#/${k}" data-r="${k}" title="${r.label}"><span class="ni">${icon(r.icon)}</span><span class="nl">${r.label}</span></a>`).join('')}</nav>
      <div class="top-right">
        <button class="daily-btn" title="Bonus quotidien"></button>
        <div class="balance-pill" title="Ton solde">${coinSVG('coin')}<span class="bal-amount">${fmt(wallet.balance)}</span></div>
        <span class="sync-dot saved" title="Sauvegardé"></span>
        <button class="icon-btn send-btn" title="Envoyer des ${CUR}">${icon('send')}</button>
        <button class="icon-btn tracker-btn" title="Suivi de balance">${icon('chart')}</button>
        <button class="icon-btn mute-btn" title="Son">${icon(sfx.muted ? 'mute' : 'sound')}</button>
        <div class="user-menu"><button class="user-btn">${esc(wallet.pseudo)} ▾</button>
          <div class="user-drop"><a href="#/stats">Mes stats</a><button class="send-menu">Envoyer des ${CUR}</button><button class="logout">Se déconnecter</button></div></div>
      </div>
    </header>
    <main id="view"></main>
    <footer class="foot">Casino Chibouk · argent fictif, aucune mise réelle · sauvegarde automatique toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s</footer>
  </div>`);
  app.append(shell);

  const balEl = $('.bal-amount', shell), pill = $('.balance-pill', shell);
  let shown = wallet.balance;
  wallet.on((evt) => {
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
  $('.send-btn', shell).onclick = openTransfer;
  $('.send-menu', shell).onclick = openTransfer;
  startInbox();
  $('.mute-btn', shell).onclick = (e) => { const m = sfx.toggle(); e.currentTarget.innerHTML = icon(m ? 'mute' : 'sound'); };
  const um = $('.user-menu', shell);
  $('.user-btn', shell).onclick = (e) => { e.stopPropagation(); um.classList.toggle('open'); };
  document.addEventListener('click', () => um.classList.remove('open'));
  $('.logout', shell).onclick = async () => { await wallet.flush(); await backend.signOut(); location.hash = '#/lobby'; };

  const daily = $('.daily-btn', shell);
  daily.onclick = claimDaily;
  function updateDaily() {
    if (wallet.dailyAvailable()) { daily.classList.add('ready'); daily.innerHTML = `${icon('gift')}<span>+${fmt(CONFIG.DAILY_BONUS)}</span>`; }
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

async function claimDaily() {
  if (!wallet.dailyAvailable()) { toast(`Bonus déjà récupéré aujourd'hui. Reviens dans ${countdown()}`); return; }
  const ok = await wallet.claimDaily();
  if (ok) { sfx.coin(); sfx.win(true); coinRain(40); toast(`+${fmt(CONFIG.DAILY_BONUS)} ${CUR} ! Bonne chance !`, 'win'); }
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
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === (ROUTES[key] ? key : 'lobby')));
  const act = $('.nav a.active');
  if (act && window.innerWidth <= 760) { const nav = act.parentElement; nav.scrollTo({ left: act.offsetLeft - nav.clientWidth / 2 + act.clientWidth / 2, behavior: 'smooth' }); }
  window.scrollTo(0, 0);
  const ctx = { wallet, backend, navigate: (k) => (location.hash = '#/' + k) };
  cleanupView = r.mount(view, ctx) || null;
}

/* ================================ LOBBY ================================ */
function renderLobbyDaily(box) {
  if (wallet.dailyAvailable()) {
    if (box.dataset.state !== 'ready') {
      box.dataset.state = 'ready';
      box.innerHTML = `<div class="daily-icon">${icon('gift')}</div><div><h3>Ton bonus quotidien est prêt !</h3><p>${fmt(CONFIG.DAILY_BONUS)} ${CUR} offerts, une fois par jour.</p></div><button class="btn btn-gold btn-lg pulse">Récupérer +${fmt(CONFIG.DAILY_BONUS)}</button>`;
      $('button', box).onclick = claimDaily;
    }
  } else {
    box.dataset.state = 'wait';
    box.innerHTML = `<div class="daily-icon wait">${icon('hourglass')}</div><div><h3>Bonus récupéré</h3><p>Prochain bonus dans <b class="mono">${countdown()}</b> (minuit, heure de Paris)</p></div>`;
  }
}

function card(key, title, desc, tag, art) {
  return `<a class="game-card gc-${key}" href="#/${key}">
    <div class="gc-art">${art}</div>
    <div class="gc-body"><div class="gc-title"><span class="gc-logo">${icon(ROUTES[key].icon)}</span><h3>${title}</h3></div><p>${desc}</p><span class="gc-tag">${tag}</span></div>
  </a>`;
}

function mountLobby(view, { wallet: w }) {
  const s = w.stats;
  view.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <h1>Salut <span class="gold">${esc(w.pseudo)}</span> !</h1>
        <p>Bienvenue au <b>Casino Chibouk</b>, le seul casino tenu par des singes. Mise tes ${CUR}, gagne, perds, recommence.</p>
        <div class="hero-bal">Ton solde : ${money(w.balance)}</div>
      </div>
      ${hangingMonkeySVG()}
    </section>
    <section id="lobby-daily" class="daily-card"></section>
    <section class="games-grid">
      ${card('slots', 'Chibouk Slot', 'Machine à sous 5×3, 21 lignes. 3 WILD = tours gratuits ×2.', 'RTP ≈ 100 %',
        `<div class="mini-reels">${['S', 'W', 'S'].map((x) => `<div>${symbolSVG(x)}</div>`).join('')}</div>`)}
      ${card('blackjack', 'Blackjack du Singe', 'Blackjack 6 jeux, paie 3:2. Doubler, séparer, cartes en 3D.', 'RTP ≈ 99,5 %',
        `<div class="mini-cards"><div class="mc mc1">A<span>♠</span></div><div class="mc mc2 red">K<span>♥</span></div></div>`)}
      ${card('roulette', 'Roulette Banane', 'Roulette européenne à un zéro, roue et bille animées.', 'RTP 97,3 %', `<div class="mini-wheel"></div>`)}
      ${card('plinko', 'Plinkoko', 'Lâche des noix de coco, 3 niveaux de risque, jusqu\'à ×1000.', 'RTP 99 %', plinkoArtSVG())}
      ${card('crash', 'Crashibouk', 'Le multiplicateur grimpe : encaisse avant que la fusée explose.', 'RTP 99 %', crashArtSVG())}
      ${card('tower', 'Tower', 'Grimpe étage par étage : chaque banane fait monter le multi, une bombe et tout explose.', 'RTP 99 %', towerArtSVG())}
      ${card('mines', 'Mines', 'Choisis le nombre de mines : plus il y en a, plus chaque banane trouvée rapporte.', 'RTP 99 %', minesArtSVG())}
      ${card('dice', 'Dice', 'Choisis ta chance de 0,01 % à 98 % : plus elle est faible, plus le dé paie.', 'RTP 99 %', diceArtSVG())}
      ${card('breaker', 'Casse-briques', `Casse toutes les briques d'un niveau : +${CONFIG.BREAKER_REWARD} ${CUR}. Gratuit, sans mise.`, 'Gratuit',
        `<div class="mini-bricks">${Array.from({ length: 15 }, (_, i) => `<i style="--h:${(i * 37) % 360}"></i>`).join('')}</div>`)}
    </section>
    <section class="mini-stats">
      <div><span>Total misé</span><b>${money(s.totalWagered)}</b></div>
      <div><span>Total gagné</span><b>${money(s.totalWon)}</b></div>
      <div><span>Bilan</span><b class="${s.totalWon - s.totalWagered >= 0 ? 'pos' : 'neg'}">${s.totalWon - s.totalWagered >= 0 ? '+' : ''}${fmt(s.totalWon - s.totalWagered)}</b></div>
      <div><span>Plus gros gain</span><b>${money(s.biggestWin)}</b></div>
      <a class="btn btn-ghost" href="#/stats">Stats & classement ${icon('arrow')}</a>
    </section>`;
  renderLobbyDaily($('#lobby-daily', view));
  const off = w.on(() => { const hb = $('.hero-bal', view); if (hb) hb.innerHTML = `Ton solde : ${money(w.balance)}`; });
  return () => off();
}

boot();
